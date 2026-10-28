#!/usr/bin/env node
// Regenerate supabase/database.types.ts and drizzle/{schema,relations}.ts from
// ONE database, so both files describe the same schema.
//
//   node scripts/generate-db-types.mjs            # local supabase stack (default)
//   node scripts/generate-db-types.mjs --prod     # production, read-only introspection (DB_URL)
//   DB_TARGET=prod|local|fresh node scripts/generate-db-types.mjs
//   ... --check                                   # also fail if the files differ from git HEAD/index
//
// Production introspection only reads the catalog (postgres-meta + drizzle-kit
// both run SELECTs). The connection string is passed to child processes via
// env/args and redacted from anything echoed.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
nextEnv.loadEnvConfig(root, false, { info() {}, error: console.error });

const args = process.argv.slice(2);
const target = args.includes("--prod")
  ? "prod"
  : process.env.DB_TARGET || "local";
const check = args.includes("--check");

const LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const urls = {
  // LOCAL_DB_URL in .env.local is the local stack; CI has no .env.local.
  local: process.env.LOCAL_DB_URL || LOCAL_URL,
  prod: process.env.PROD_DB_URL || process.env.DB_URL,
  // Throwaway DB built from migrations by scripts/schema-drift/fresh.mjs.
  fresh:
    process.env.FRESH_DB_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54399/postgres",
};
const dbUrl = urls[target];
if (!dbUrl)
  fail(
    `no connection string for target "${target}" (prod needs PROD_DB_URL or DB_URL)`,
  );
if (target !== "prod" && !/@(127\.0\.0\.1|localhost)[:/]/.test(dbUrl)) {
  fail(
    `target "${target}" resolved to a non-local database; refusing (use --prod for production)`,
  );
}

const secrets = [
  dbUrl,
  safe(() => new URL(dbUrl).password),
  safe(() => decodeURIComponent(new URL(dbUrl).password)),
].filter((s) => s && s.length > 3);
function redact(s) {
  for (const x of secrets) s = s.split(x).join("<redacted>");
  return s;
}
function safe(f) {
  try {
    return f();
  } catch {
    return null;
  }
}
function fail(msg) {
  console.error(`generate-db-types: ${redact(msg)}`);
  process.exit(1);
}

function run(cmd, cmdArgs, env = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    env: { ...process.env, ...env, DO_NOT_TRACK: "1" },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0)
    fail(
      `${cmd} ${cmdArgs[0]} failed:\n${redact((r.stderr || "") + (r.stdout || ""))}`,
    );
  return r.stdout;
}

const bin = (name) => path.join(root, "node_modules", ".bin", name);

// 1. Supabase types. `public` only: the app never reads the storage or
// graphql_public types, and those schemas follow the platform's version
// (hosted storage-api is ahead of the CLI image), not our migrations.
const genArgs = ["gen", "types", "--lang", "typescript", "--schema", "public"];
// --db-url even for local: doesn't depend on the CLI's container naming, so the
// CLI that started the stack (CI's setup-cli) can differ from this one.
genArgs.push("--db-url", dbUrl);
const types = run(bin("supabase"), genArgs);
if (!types.includes("export type Database"))
  fail("supabase gen types produced no Database type");

const { extensionFunctions, publicEnums, generatedColumns } =
  await catalogFacts();
fs.writeFileSync(
  "supabase/database.types.ts",
  nullableReturns(
    neverWriteGenerated(
      dropFunctions(types, extensionFunctions),
      generatedColumns,
    ),
  ),
);

// 2. Drizzle. drizzle.config.ts reads DB_URL; @next/env never overrides a var
// that's already set, so the child's DB_URL wins over .env.local.
run(bin("drizzle-kit"), ["introspect"], { DB_URL: dbUrl });
for (const f of fs.readdirSync("drizzle")) {
  if (f.endsWith(".sql") || f === "meta")
    fs.rmSync(path.join("drizzle", f), { recursive: true, force: true });
}
const schemaTs = fs.readFileSync("drizzle/schema.ts", "utf8");
fs.writeFileSync(
  "drizzle/schema.ts",
  canonicalizeDrizzle(dropForeignEnums(schemaTs, publicEnums)),
);
fs.writeFileSync(
  "drizzle/relations.ts",
  canonicalizeDrizzle(fs.readFileSync("drizzle/relations.ts", "utf8")),
);

console.log(
  `generate-db-types: wrote supabase/database.types.ts and drizzle/ from ${target}`,
);

if (check) {
  const d = spawnSync(
    "git",
    [
      "diff",
      "--exit-code",
      "--stat",
      "--",
      "supabase/database.types.ts",
      "drizzle/",
    ],
    { encoding: "utf8" },
  );
  if (d.status !== 0) {
    console.error(d.stdout);
    console.error(
      `generate-db-types --check: the ${target} schema doesn't match the committed types.\n` +
        (target === "prod"
          ? "Production has drifted from the migrations: diff the catalogs with\n" +
            "  node --env-file=.env.local scripts/schema-drift/drift.mjs check\n" +
            "and add a catch-up migration (see scripts/schema-drift/README.md)."
          : "Regenerate with `node scripts/generate-db-types.mjs` against a migrated local db and commit the result,\n" +
            "or fix the migration so it matches the committed types."),
    );
    process.exit(1);
  }
  console.log("generate-db-types --check: committed types match");
}

// Extension-owned functions (pg_trgm lives in public) and enums from other
// schemas aren't part of our schema; they follow the extension/platform
// version, so leaving them in makes output depend on which host generated it.
async function catalogFacts() {
  const isLocal = /@(127\.0\.0\.1|localhost)[:/]/.test(dbUrl);
  const c = new pg.Client({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  try {
    await c.connect();
    await c.query("SET default_transaction_read_only = on");
    const fns = await c.query(`
      select distinct p.proname from pg_proc p join pg_depend d on d.objid = p.oid and d.deptype = 'e'
      where p.pronamespace = 'public'::regnamespace`);
    const enums = await c.query(
      `select typname from pg_type where typtype = 'e' and typnamespace = 'public'::regnamespace`,
    );
    const generated = await c.query(`
      select c.relname, a.attname from pg_attribute a join pg_class c on c.oid = a.attrelid
      where c.relnamespace = 'public'::regnamespace and a.attgenerated = 's' and not a.attisdropped`);
    return {
      extensionFunctions: new Set(fns.rows.map((r) => r.proname)),
      publicEnums: new Set(enums.rows.map((r) => r.typname)),
      generatedColumns: new Set(
        generated.rows.map((r) => `${r.relname}.${r.attname}`),
      ),
    };
  } catch (e) {
    fail(`catalog query failed: ${e.code || ""} ${e.message}`);
  } finally {
    await c.end().catch(() => {});
  }
}

// Postgres rejects any value for a GENERATED ALWAYS column, but the pinned CLI
// types it as writable on Insert/Update.
function neverWriteGenerated(src, columns) {
  let inTables = false,
    table = null,
    writable = false;
  return src
    .split("\n")
    .map((line) => {
      if (/^    \w+: \{$/.test(line)) inTables = line === "    Tables: {";
      if (!inTables) return line;
      const t = line.match(/^      (\w+): \{$/);
      if (t) table = t[1];
      const sec = line.match(/^        (\w+): \{$/);
      if (sec) writable = sec[1] === "Insert" || sec[1] === "Update";
      const col = line.match(/^          (\w+)\?: .*$/);
      return writable && col && columns.has(`${table}.${col[1]}`)
        ? `          ${col[1]}?: never`
        : line;
    })
    .join("\n");
}

// Postgres records no nullability for RETURNS TABLE columns, so the generator
// types them all non-null. These pass nullable table columns straight through.
function nullableReturns(src) {
  const NULLABLE_RETURNS = {
    get_facts_for_roots: ["author_did"],
    get_facts_with_depth: ["author_did"],
  };
  let fn = null,
    inReturns = false;
  return src
    .split("\n")
    .map((line) => {
      const f = line.match(/^      (\w+): \{$/);
      if (f) fn = f[1];
      if (/^        Returns: \{$/.test(line)) inReturns = true;
      else if (/^        \}/.test(line)) inReturns = false;
      const col = inReturns && line.match(/^          (\w+): (.*)$/);
      return col &&
        NULLABLE_RETURNS[fn]?.includes(col[1]) &&
        !col[2].includes("| null")
        ? `${line} | null`
        : line;
    })
    .join("\n");
}

function dropFunctions(src, names) {
  const out = [];
  let inPublic = false,
    inFunctions = false,
    skipping = false;
  for (const line of src.split("\n")) {
    if (/^  \w+: \{$/.test(line)) inPublic = line === "  public: {";
    if (inPublic && /^    \w+: \{$/.test(line))
      inFunctions = line === "    Functions: {";
    if (inFunctions) {
      const m = line.match(/^      (\w+):/);
      if (m) skipping = names.has(m[1]);
      else if (/^    \}/.test(line)) skipping = inFunctions = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n");
}

function dropForeignEnums(src, keep) {
  return src
    .split("\n")
    .filter((line) => {
      const m = line.match(/^export const (\w+) = pgEnum\("([^"]+)"/);
      return !m || keep.has(m[2]);
    })
    .join("\n");
}

// drizzle-kit emits tables, columns, indexes and relations in catalog (oid /
// attnum) order, so the same schema created in a different order (prod's
// history vs a fresh migrate) yields reordered files. Sort everything by name.
function canonicalizeDrizzle(src) {
  const lines = src.replace(/\s+$/, "").split("\n");
  const header = [];
  const blocks = [];
  for (const line of lines) {
    if (line.startsWith("export const ")) blocks.push([line]);
    else if (blocks.length) blocks.at(-1).push(line);
    else header.push(line);
  }
  const sortedHeader = header
    .map((l) =>
      l.replace(
        /^import \{ (.*) \} from (.*)$/,
        (_, names, from) =>
          `import { ${names.split(", ").sort().join(", ")} } from ${from}`,
      ),
    )
    .join("\n")
    .trimEnd();
  const name = (b) => b[0].match(/^export const (\w+)/)[1];
  const isEnum = (b) => /= pgEnum\(/.test(b[0]);
  blocks.sort(
    (a, b) =>
      isEnum(b) - isEnum(a) ||
      (name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0),
  );
  const body = blocks.map((b) =>
    sortEntries(sortEntries(trimBlank(b), 1), 2).join("\n"),
  );
  return [sortedHeader, ...body].join("\n\n") + "\n";
}

function trimBlank(b) {
  while (b.length && b.at(-1).trim() === "") b.pop();
  return b;
}

// Sort each run of `<depth tabs>key: ...` entries (with their deeper-indented
// continuation lines) by key.
function sortEntries(lines, depth) {
  const start = new RegExp(`^\t{${depth}}(\\w+):`);
  const deeper = new RegExp(`^\t{${depth + 1}}`);
  // `}),` closes a multi-line entry; a bare `}` closes the enclosing object.
  const closer = new RegExp(`^\t{${depth}}[})\\]].`);
  const out = [];
  let run = [];
  const flush = () => {
    run.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    for (const e of run) {
      const last = e.lines.length - 1;
      if (!e.lines[last].endsWith(",")) e.lines[last] += ",";
      out.push(...e.lines);
    }
    run = [];
  };
  for (const line of lines) {
    const m = line.match(start);
    if (m) run.push({ key: m[1], lines: [line] });
    else if (run.length && (deeper.test(line) || closer.test(line)))
      run.at(-1).lines.push(line);
    else {
      flush();
      out.push(line);
    }
  }
  flush();
  return out;
}
