#!/usr/bin/env node
// Build a throwaway Postgres from supabase/migrations only, to answer "what
// does the repo's migration history actually produce?" independently of the
// long-lived local stack (which accumulates hand-applied changes).
//
//   node scripts/schema-drift/fresh.mjs up      # start container + apply every migration
//   node scripts/schema-drift/fresh.mjs down    # remove the container
//
// Then: drift.mjs snapshot fresh  (FRESH_DB_URL is used automatically)
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const NAME = "schema-drift-fresh";
const PORT = process.env.FRESH_DB_PORT || "54399";
// Same image tag as the local CLI stack (supabase_db_<project>).
const IMAGE =
  process.env.FRESH_DB_IMAGE || "public.ecr.aws/supabase/postgres:15.1.1.61";
export const FRESH_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`;
const MIGRATIONS = path.resolve(
  import.meta.dirname,
  "../../supabase/migrations",
);

const docker = (...a) =>
  execFileSync("docker", a, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try {
      const c = new pg.Client({ connectionString: FRESH_URL });
      await c.connect();
      await c.query("select 1");
      await c.end();
      // The image restarts once after running its init scripts.
      if (i > 0 || docker("logs", NAME).includes("ready to accept connections"))
        return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("fresh db never became ready");
}

async function up() {
  try {
    docker("rm", "-f", NAME);
  } catch {}
  docker(
    "run",
    "-d",
    "--name",
    NAME,
    "-p",
    `127.0.0.1:${PORT}:5432`,
    "-e",
    "POSTGRES_PASSWORD=postgres",
    IMAGE,
  );
  await new Promise((r) => setTimeout(r, 5000));
  await waitReady();
  const c = new pg.Client({ connectionString: FRESH_URL });
  await c.connect();
  await c.query(`create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`);
  const files = fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let failed = 0;
  for (const f of files) {
    const [, version, name] = f.match(/^(\d+)_?(.*)\.sql$/) ?? [];
    const sql = fs.readFileSync(path.join(MIGRATIONS, f), "utf8");
    // CREATE INDEX CONCURRENTLY can't run in a transaction; those migrations are single statements.
    const tx = !/\bconcurrently\b/i.test(sql);
    try {
      if (tx) await c.query("begin");
      await c.query(sql);
      await c.query(
        "insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)",
        [version, name],
      );
      if (tx) await c.query("commit");
    } catch (e) {
      if (tx) await c.query("rollback");
      failed++;
      console.log(`FAILED ${f}: ${e.message}`);
    }
  }
  await c.end();
  console.log(
    `applied ${files.length - failed}/${files.length} migrations to ${NAME} (${FRESH_URL})`,
  );
  if (failed) process.exitCode = 1;
}

const cmd = process.argv[2];
if (cmd === "up") await up();
else if (cmd === "down") {
  try {
    docker("rm", "-f", NAME);
  } catch {}
} else {
  console.error("usage: fresh.mjs up|down");
  process.exitCode = 2;
}
