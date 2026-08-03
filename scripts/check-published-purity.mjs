// Guards the app/(app)/(published) route group's cacheability invariant:
// nothing in it may read request state (cookies/headers/identity). The
// identity-gated publication surfaces (dashboard, edit, createPub, ...) live
// in the (identity) group, so the published group has no exceptions.
//
// Checks run here:
//  1. No request-state read in the group's route files, and none in any module
//     transitively reachable from a public entry file — a helper under src/ or
//     components/ that reads cookies is a 500 on a prerendered route, and
//     nothing else in CI would catch it.
//  2. Every public page still opts into ISR (revalidate + generateStaticParams);
//     `revalidate` alone leaves the route fully dynamic, and losing either one
//     silently un-caches the page rather than failing anything.
// Members-only posts are not an exception either: they render their gated
// variant for every viewer and entitled readers unlock the tail through the
// getUnlockedPost action (a POST, not a render).
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PUBLISHED = join(ROOT, "app/(app)/(published)");

const DYNAMIC_READS =
  /\bcookies\(|\bheaders\(|\bdraftMode\(|\bgetIdentityData\b|\bgetAuthIdentity\b|\bgetViewerIdentity\b|\bgetHomeLeaflet\b/;
let failures = [];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(entry)) yield p;
  }
}

for (const file of walk(PUBLISHED)) {
  const rel = relative(PUBLISHED, file);
  const src = readFileSync(file, "utf8");

  // Server-action modules run on POST, not during page render — identity
  // reads there don't affect cacheability.
  if (/^\s*["']use server["']/.test(src)) continue;

  if (DYNAMIC_READS.test(src)) {
    for (const [i, line] of src.split("\n").entries()) {
      if (DYNAMIC_READS.test(line) && !line.trim().startsWith("//"))
        failures.push(
          `${rel}:${i + 1} reads request state in the (published) group: ${line.trim()}`,
        );
    }
  }

  // useSearchParams in a client component strips everything up to the nearest
  // Suspense boundary from statically-rendered HTML (and 500s without one).
  // Published-tree components read the query string via
  // src/hooks/useClientSearchParams instead, which keeps SSR param-free.
  if (/\buseSearchParams\b/.test(src)) {
    for (const [i, line] of src.split("\n").entries()) {
      if (/\buseSearchParams\b/.test(line) && !line.trim().startsWith("//"))
        failures.push(
          `${rel}:${i + 1} uses useSearchParams in the (published) group (use useClientSearchParams): ${line.trim()}`,
        );
    }
  }
}

// --- Every public page must still opt into ISR ---------------------------
// `revalidate` on its own leaves a dynamic-param route fully dynamic, so both
// halves have to be present. Only page.tsx: route handlers set their own cache
// headers.
for (const file of walk(PUBLISHED)) {
  const rel = relative(PUBLISHED, file);
  if (!/(^|\/)page\.tsx$/.test(rel)) continue;
  const src = readFileSync(file, "utf8");
  if (!/export const revalidate\b/.test(src))
    failures.push(
      `${rel} is a public page but declares no revalidate (not ISR)`,
    );
  if (!/generateStaticParams\b/.test(src))
    failures.push(
      `${rel} is a public page but declares no generateStaticParams — revalidate alone leaves it dynamic`,
    );
}

// --- Transitive reachability of request-state reads ----------------------
// The per-file scan above only sees the route files themselves. A cookies()
// read behind two levels of import is just as fatal on a prerendered route, so
// walk the import graph from every public entry file.
const SOURCE_ROOTS = [
  "app",
  "components",
  "src",
  "actions",
  "contexts",
  "lexicons",
  "supabase",
];
const resolveCache = new Map();

function resolveImport(spec, fromFile) {
  const key = `${spec}\0${fromFile}`;
  if (resolveCache.has(key)) return resolveCache.get(key);
  let base;
  if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else if (SOURCE_ROOTS.some((r) => spec === r || spec.startsWith(r + "/")))
    base = join(ROOT, spec);
  else base = null; // node_modules / unresolvable — not ours to check
  let found = null;
  if (base) {
    for (const cand of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      join(base, "index.ts"),
      join(base, "index.tsx"),
    ]) {
      if (existsSync(cand) && statSync(cand).isFile()) {
        found = cand;
        break;
      }
    }
  }
  resolveCache.set(key, found);
  return found;
}

// `import type` is erased at build time and carries no runtime reachability —
// following it would pull in, say, every RPC handler via the one `Env` type
// that get_standard_site_posts imports from its route module.
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?([\s\S]*?)from\s*["']([^"']+)["']/g;
function importsOf(src, file) {
  const out = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    if (m[1]) continue;
    const target = resolveImport(m[3], file);
    if (target) out.push(target);
  }
  return out;
}

// Entry files of the public routes.
const ENTRY_RE =
  /(page|layout|route|opengraph-image|icon|not-found|loading|sitemap|robots)\.(ts|tsx)$/;
const entries = [...walk(PUBLISHED)].filter((f) =>
  ENTRY_RE.test(relative(PUBLISHED, f)),
);

const visited = new Map(); // file -> chain that first reached it
for (const entry of entries) {
  const stack = [[entry, [relative(ROOT, entry)]]];
  while (stack.length) {
    const [file, chain] = stack.pop();
    if (visited.has(file)) continue;
    visited.set(file, chain);
    const src = readFileSync(file, "utf8");
    // Two boundaries end the walk, because past either one nothing runs during
    // the server render of this page:
    //  - "use server": the module is invoked as an RPC on POST.
    //  - "use client": the module runs in the browser. cookies()/headers() are
    //    not even callable there, and its identity reads are the client-side
    //    SWR fetches this whole split is built on. Walking through client
    //    components would drag in every server action they can call.
    if (/^\s*["']use (server|client)["']/m.test(src)) continue;
    const lines = src.split("\n");
    for (const [i, line] of lines.entries()) {
      if (!DYNAMIC_READS.test(line) || line.trim().startsWith("//")) continue;
      // Reachability here is module-level: importing a module never runs it.
      // When the read lives in a function no published page calls, say so on
      // the line (or the one above) and why.
      if (
        /published-purity-ok:/.test(
          lines.slice(Math.max(0, i - 3), i + 1).join("\n"),
        )
      )
        continue;
      failures.push(
        `${relative(ROOT, file)}:${i + 1} reads request state and is reachable from a public (published) page` +
          `\n    via ${chain.join(" -> ")}\n    ${line.trim()}` +
          `\n    (if no published page can call this, annotate the line: published-purity-ok: <reason>)`,
      );
    }
    for (const next of importsOf(src, file))
      if (!visited.has(next))
        stack.push([next, [...chain, relative(ROOT, next)]]);
  }
}

if (failures.length) {
  console.error("published-purity check failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log(
  `published-purity check passed (${entries.length} public entries, ${visited.size} modules walked)`,
);
