# schema-drift

Compare the catalog of production, the long-lived local Supabase stack, and a
throwaway database built only from `supabase/migrations`.

```bash
# prod (read-only) vs local stack; writes scripts/schema-drift/snapshots/{prod,local}.json
node --env-file=.env.local scripts/schema-drift/drift.mjs check

# what the migrations alone produce (docker; same image as the local stack)
node scripts/schema-drift/fresh.mjs up
node scripts/schema-drift/drift.mjs snapshot fresh /tmp/fresh.json
node scripts/schema-drift/drift.mjs diff scripts/schema-drift/snapshots/prod.json /tmp/fresh.json
node scripts/schema-drift/fresh.mjs down

# print prod's definition of an object, for writing a catch-up migration
node --env-file=.env.local scripts/schema-drift/drift.mjs defs prod index public.facts_entity_idx
#   kinds: function | index | view | trigger | policy | constraint (keys as printed in the diff)
```

Targets: `prod` = `DB_URL`, `local` = `LOCAL_DB_URL` or `127.0.0.1:54322`,
`fresh` = `FRESH_DB_URL` or `127.0.0.1:54399`, or the name of any env var that
holds a connection string. In a diff, `-` is only in the first snapshot, `+`
only in the second, `~` in both but different. Exit code is 1 when there are
differences.

## Safety

Every session sets `default_transaction_read_only = on` and runs inside
`BEGIN READ ONLY`, and only reads `pg_catalog` / `information_schema`,
`pg_settings`, role settings, `storage.buckets` metadata, `cron.job`
metadata and `supabase_migrations.schema_migrations`. No app rows are read.
Connection strings are never printed. Role/database settings whose name looks
secret (`*secret*`, `*key*`, `*token*`, `*password*`, `*jwt*`) are stored as
`<masked:hash>` so a change still shows up. Function bodies, view definitions
and cron commands are stored as hashes; use `defs` to see a body.

## What's captured

Postgres version; extensions; plan-relevant `pg_settings`; role and database
settings (`pgrst.*`, `statement_timeout`, ...); app-schema tables, columns
(type/default/nullability/identity/generated/collation/statistics target),
column order, indexes (incl. partial/expression, validity), constraints (incl.
NOT VALID), functions (signature, result, language, volatility, SECURITY
DEFINER, `proconfig`, body hash, owner), triggers, views, RLS flags, policies,
grants to anon/authenticated/service_role/authenticator/postgres/PUBLIC,
default privileges, sequences, enums/domains/composite types, extended
statistics, publications, event triggers, storage buckets, pg_cron jobs and
migration history. Table sizes/row estimates and index scan counts go under
`info` and aren't diffed.

## Ignored as noise

- Tables/functions in Supabase-managed schemas (`auth`, `storage`, `realtime`,
  `extensions`, `graphql*`, `vault`, `pgsodium*`, `net`, `cron`,
  `supabase_*`, `_analytics`, `_realtime`, `_supavisor`, ...): they follow the
  platform/CLI image version. Policies on `storage.*`, app triggers on platform
  tables, buckets and cron jobs are still captured.
- Objects owned by an extension (e.g. pg_trgm's functions in `public`); the
  extension itself and its version are captured.
- Publication membership of platform tables (`realtime.messages_YYYY_MM_DD`
  partitions rotate daily).

Expected residue between prod and a correct local stack: platform schemas and
extensions that only the CLI stack has (pg_graphql, pgjwt, pg_net), instance
sizing settings, platform role settings, newer hosted storage tables, the
`local dev: upload user assets` policy and `pgrst.db_max_rows` on the local
`authenticator` role. See `REPORT-2026-10-28.md`.

## Generated types

`scripts/generate-db-types.mjs` regenerates `supabase/database.types.ts` and
`drizzle/` from one database (local by default, `--prod` for production,
`DB_TARGET=fresh` for the throwaway db) and canonicalizes the output (public
schema only, extension functions and non-public enums removed, drizzle output
sorted by name), so the same schema always yields byte-identical files.
`--check` fails when the result differs from the committed files.
