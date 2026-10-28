#!/usr/bin/env node
// Catalog snapshot + diff for prod-vs-local Supabase drift.
//
//   node --env-file=.env.local scripts/schema-drift/drift.mjs snapshot <prod|local|fresh|URL_ENV_VAR> [out.json]
//   node scripts/schema-drift/drift.mjs diff <a.json> <b.json>
//   node --env-file=.env.local scripts/schema-drift/drift.mjs check   # snapshot prod + local, diff
//   node --env-file=.env.local scripts/schema-drift/drift.mjs defs <prod|local> <kind> <key>...
//
// Every session is READ ONLY (default_transaction_read_only + BEGIN READ ONLY)
// and only reads catalog/config tables. Connection strings are never printed.
import pg from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const LOCAL_DEFAULT = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
// Throwaway DB built from supabase/migrations by fresh.mjs.
const FRESH_DEFAULT = "postgresql://postgres:postgres@127.0.0.1:54399/postgres";

// Schemas owned by Postgres or the Supabase platform. Their tables/functions
// differ between the hosted image and the CLI image and aren't ours to migrate.
// Policies/triggers on storage + auth tables, storage.buckets, cron.job and
// the realtime publication are still captured below because the app creates them.
const PLATFORM_SCHEMAS = [
  "pg_catalog",
  "information_schema",
  "pg_toast",
  "auth",
  "storage",
  "realtime",
  "_realtime",
  "extensions",
  "graphql",
  "graphql_public",
  "supabase_functions",
  "supabase_migrations",
  "vault",
  "pgsodium",
  "pgsodium_masks",
  "net",
  "cron",
  "pgbouncer",
  "_analytics",
  "_supavisor",
  "pgtle",
  "tiger",
  "topology",
];
const APP_ROLES = [
  "anon",
  "authenticated",
  "service_role",
  "authenticator",
  "postgres",
  "PUBLIC",
];
const SETTINGS = [
  "server_version_num",
  "shared_buffers",
  "work_mem",
  "maintenance_work_mem",
  "effective_cache_size",
  "random_page_cost",
  "seq_page_cost",
  "cpu_tuple_cost",
  "cpu_index_tuple_cost",
  "cpu_operator_cost",
  "effective_io_concurrency",
  "jit",
  "jit_above_cost",
  "max_connections",
  "max_worker_processes",
  "max_parallel_workers",
  "max_parallel_workers_per_gather",
  "max_parallel_maintenance_workers",
  "statement_timeout",
  "lock_timeout",
  "idle_in_transaction_session_timeout",
  "default_statistics_target",
  "from_collapse_limit",
  "join_collapse_limit",
  "geqo_threshold",
  "plan_cache_mode",
  "hash_mem_multiplier",
  "enable_seqscan",
  "enable_indexscan",
  "enable_bitmapscan",
  "enable_hashjoin",
  "enable_mergejoin",
  "enable_nestloop",
  "enable_partitionwise_join",
  "enable_memoize",
  "huge_pages",
  "track_io_timing",
  "autovacuum",
  "autovacuum_vacuum_scale_factor",
  "autovacuum_analyze_scale_factor",
  "autovacuum_max_workers",
  "autovacuum_naptime",
  "wal_level",
  "max_wal_size",
  "checkpoint_timeout",
  "shared_preload_libraries",
  "search_path",
  "TimeZone",
  "default_transaction_isolation",
  "max_locks_per_transaction",
  "temp_buffers",
  "session_preload_libraries",
  "pgrst.db_max_rows",
];
const SECRETISH = /secret|password|passwd|key|token|jwt|credential/i;

const sha = (s) =>
  s == null
    ? null
    : crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const mask = (setting) => {
  const i = setting.indexOf("=");
  const k = setting.slice(0, i);
  return SECRETISH.test(k)
    ? `${k}=<masked:${sha(setting.slice(i + 1))}>`
    : setting;
};
// Function bodies: whitespace-normalized so reformatting alone isn't drift.
const normBody = (s) => (s == null ? null : s.replace(/\s+/g, " ").trim());

function resolveUrl(target) {
  if (target === "local") return process.env.LOCAL_DB_URL || LOCAL_DEFAULT;
  if (target === "prod") return need("DB_URL");
  if (target === "fresh") return process.env.FRESH_DB_URL || FRESH_DEFAULT;
  return need(target);
}
function need(v) {
  if (!process.env[v])
    throw new Error(`${v} not set (run with node --env-file=.env.local)`);
  return process.env[v];
}

async function connect(target) {
  const url = resolveUrl(target);
  const isLocal = /@(127\.0\.0\.1|localhost)[:/]/.test(url);
  const client = new pg.Client({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    application_name: "schema-drift (read-only)",
  });
  try {
    await client.connect();
  } catch (e) {
    // pg error messages can echo the host; keep output secret-free.
    throw new Error(`could not connect to ${target}: ${e.code || "error"}`);
  }
  await client.query("SET default_transaction_read_only = on");
  await client.query("BEGIN READ ONLY");
  await client.query("SET LOCAL statement_timeout = '60s'");
  return client;
}

export async function snapshot(target) {
  const c = await connect(target);
  const q = async (sql, params) => (await c.query(sql, params)).rows;
  const has = async (rel) =>
    (await q(`select to_regclass($1) is not null as ok`, [rel]))[0].ok;
  const ex = PLATFORM_SCHEMAS;
  const s = { meta: {}, info: {} };
  try {
    const [{ v }] = await q(`select current_setting('server_version') as v`);
    s.meta.server_version = v;
    s.meta.server_major = v.split(".")[0];

    s.schemas = Object.fromEntries(
      (
        await q(
          `select nspname from pg_namespace where nspname !~ '^pg_(temp|toast_temp)_' order by 1`,
        )
      ).map((r) => [r.nspname, ex.includes(r.nspname) ? "platform" : "app"]),
    );
    const appSchemas = Object.keys(s.schemas).filter(
      (n) => s.schemas[n] === "app",
    );

    s.extensions = Object.fromEntries(
      (
        await q(
          `select e.extname, e.extversion, n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace`,
        )
      ).map((r) => [r.extname, { version: r.extversion, schema: r.nspname }]),
    );
    // Objects that belong to an extension (pg_trgm's gtrgm_* functions etc.) are
    // tracked through the extension entry, not individually.
    const extDep = `not exists (select 1 from pg_depend d where d.objid = %OID% and d.deptype = 'e')`;

    s.settings = Object.fromEntries(
      (
        await q(
          `select name, setting, unit from pg_settings where name = any($1)`,
          [SETTINGS],
        )
      ).map((r) => [r.name, r.unit ? `${r.setting} ${r.unit}` : r.setting]),
    );

    s.role_settings = {};
    for (const r of await q(`
      select coalesce(r.rolname,'*') as role, coalesce(d.datname,'*') as db, s.setconfig
      from pg_db_role_setting s
      left join pg_roles r on r.oid = s.setrole
      left join pg_database d on d.oid = s.setdatabase
      where s.setdatabase = 0 or d.datname = current_database()`)) {
      for (const cfg of r.setconfig) {
        const m = mask(cfg);
        const i = m.indexOf("=");
        s.role_settings[`${r.role}@${r.db} ${m.slice(0, i)}`] = m.slice(i + 1);
      }
    }
    s.roles = Object.fromEntries(
      (
        await q(
          `select rolname, rolsuper, rolinherit, rolcanlogin, rolbypassrls, rolconnlimit from pg_roles
                where rolname = any($1)`,
          [APP_ROLES],
        )
      ).map((r) => [
        r.rolname,
        {
          super: r.rolsuper,
          login: r.rolcanlogin,
          bypassrls: r.rolbypassrls,
          connlimit: r.rolconnlimit,
        },
      ]),
    );

    s.relations = {};
    s.columns = {};
    s.column_order = {};
    for (const r of await q(
      `
      select n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.relpersistence,
             c.relreplident, c.reloptions, pg_get_userbyid(c.relowner) as owner, c.relispartition,
             pg_get_expr(c.relpartbound, c.oid) as partbound, obj_description(c.oid, 'pg_class') as comment
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1) and c.relkind in ('r','p','v','m','f','S')
        and ${extDep.replace("%OID%", "c.oid")}`,
      [appSchemas],
    )) {
      s.relations[`${r.nspname}.${r.relname}`] = {
        kind: {
          r: "table",
          p: "partitioned",
          v: "view",
          m: "matview",
          f: "foreign",
          S: "sequence",
        }[r.relkind],
        rls: r.relrowsecurity,
        force_rls: r.relforcerowsecurity,
        persistence: r.relpersistence,
        replica_identity: r.relreplident,
        reloptions: r.reloptions,
        owner: r.owner,
        partbound: r.partbound,
        comment: r.comment,
      };
    }
    for (const r of await q(
      `
      select n.nspname, c.relname, a.attname, a.attnum, format_type(a.atttypid, a.atttypmod) as type, a.attnotnull,
             pg_get_expr(d.adbin, d.adrelid) as def, a.attidentity, a.attgenerated, a.attstattarget,
             co.collname, col_description(c.oid, a.attnum) as comment
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      left join pg_collation co on co.oid = a.attcollation and a.attcollation <> 100
      where n.nspname = any($1) and c.relkind in ('r','p','v','m','f') and a.attnum > 0 and not a.attisdropped
        and ${extDep.replace("%OID%", "c.oid")}
      order by n.nspname, c.relname, a.attnum`,
      [appSchemas],
    )) {
      const t = `${r.nspname}.${r.relname}`;
      s.columns[`${t}.${r.attname}`] = {
        type: r.type,
        notnull: r.attnotnull,
        default: r.def,
        identity: r.attidentity || null,
        generated: r.attgenerated || null,
        stattarget: r.attstattarget > 0 ? r.attstattarget : null,
        collation: r.collname,
        comment: r.comment,
      };
      (s.column_order[t] ??= []).push(r.attname);
    }
    for (const t in s.column_order)
      s.column_order[t] = s.column_order[t].join(",");

    s.indexes = Object.fromEntries(
      (
        await q(
          `
        select n.nspname, i.relname, pg_get_indexdef(i.oid) as def, x.indisvalid, x.indisready
        from pg_index x join pg_class i on i.oid = x.indexrelid join pg_namespace n on n.oid = i.relnamespace
        where n.nspname = any($1)`,
          [appSchemas],
        )
      ).map((r) => [
        `${r.nspname}.${r.relname}`,
        { def: r.def, valid: r.indisvalid && r.indisready },
      ]),
    );

    s.constraints = Object.fromEntries(
      (
        await q(
          `
        select n.nspname, c.relname, k.conname, k.contype, pg_get_constraintdef(k.oid) as def, k.convalidated, k.condeferrable
        from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any($1)`,
          [appSchemas],
        )
      ).map((r) => [
        `${r.nspname}.${r.relname}.${r.conname}`,
        {
          type: r.contype,
          def: r.def,
          validated: r.convalidated,
          deferrable: r.condeferrable,
        },
      ]),
    );

    s.functions = {};
    for (const r of await q(
      `
      select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
             pg_get_function_result(p.oid) as result, l.lanname, p.provolatile, p.prosecdef, p.proisstrict,
             p.proparallel, p.prokind, p.proconfig, p.prosrc, pg_get_userbyid(p.proowner) as owner, p.prorows, p.procost
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
      where n.nspname = any($1) and ${extDep.replace("%OID%", "p.oid")}`,
      [appSchemas],
    )) {
      s.functions[`${r.nspname}.${r.proname}(${r.args})`] = {
        result: r.result,
        lang: r.lanname,
        volatility: r.provolatile,
        secdef: r.prosecdef,
        strict: r.proisstrict,
        parallel: r.proparallel,
        kind: r.prokind,
        config: r.proconfig?.map(mask) ?? null,
        body_sha: sha(normBody(r.prosrc)),
        owner: r.owner,
        rows: Number(r.prorows),
        cost: Number(r.procost),
      };
    }

    // Triggers on every non-system table (app triggers on auth.users etc. count),
    // but skip platform triggers that live on platform tables in platform schemas
    // unless they call an app-schema function.
    s.triggers = Object.fromEntries(
      (
        await q(
          `
        select n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid) as def, t.tgenabled, pn.nspname as fn_schema
        from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
        join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
        where not t.tgisinternal and (n.nspname = any($1) or pn.nspname = any($1))`,
          [appSchemas],
        )
      ).map((r) => [
        `${r.nspname}.${r.relname}.${r.tgname}`,
        { def: r.def, enabled: r.tgenabled },
      ]),
    );

    s.views = Object.fromEntries(
      (
        await q(
          `
        select n.nspname, c.relname, c.relkind, pg_get_viewdef(c.oid) as def
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any($1) and c.relkind in ('v','m')`,
          [appSchemas],
        )
      ).map((r) => [
        `${r.nspname}.${r.relname}`,
        { def_sha: sha(normBody(r.def)) },
      ]),
    );

    // App policies live on public tables and on storage.objects/buckets.
    s.policies = Object.fromEntries(
      (
        await q(
          `
        select schemaname, tablename, policyname, permissive, roles::text[] as roles, cmd, qual, with_check
        from pg_policies where schemaname = any($1) or schemaname = 'storage'`,
          [appSchemas],
        )
      ).map((r) => [
        `${r.schemaname}.${r.tablename}.${r.policyname}`,
        {
          permissive: r.permissive,
          roles: [...r.roles].sort().join(","),
          cmd: r.cmd,
          qual: r.qual,
          with_check: r.with_check,
        },
      ]),
    );
    // RLS flags of storage tables matter to the app too.
    for (const r of await q(`
      select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='storage' and c.relkind='r'`)) {
      s.relations[`storage.${r.relname}`] = {
        kind: "platform-table",
        rls: r.relrowsecurity,
      };
    }

    s.grants = {};
    const roleName = `case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end`;
    for (const r of await q(
      `
      select n.nspname, c.relname, ${roleName} as grantee, string_agg(a.privilege_type, ',' order by a.privilege_type) as privs
      from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a
      where n.nspname = any($1) and c.relkind in ('r','p','v','m','f','S') and ${extDep.replace("%OID%", "c.oid")}
      group by 1,2,3`,
      [appSchemas],
    )) {
      if (APP_ROLES.includes(r.grantee))
        s.grants[`rel ${r.nspname}.${r.relname} -> ${r.grantee}`] = r.privs;
    }
    for (const r of await q(
      `
      select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args, ${roleName} as grantee,
             string_agg(a.privilege_type, ',' order by a.privilege_type) as privs
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
           aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where n.nspname = any($1) and ${extDep.replace("%OID%", "p.oid")}
      group by 1,2,3,4`,
      [appSchemas],
    )) {
      if (APP_ROLES.includes(r.grantee))
        s.grants[`fn ${r.nspname}.${r.proname}(${r.args}) -> ${r.grantee}`] =
          r.privs;
    }
    for (const r of await q(
      `
      select n.nspname, ${roleName} as grantee, string_agg(a.privilege_type, ',' order by a.privilege_type) as privs
      from pg_namespace n, aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
      where n.nspname = any($1) group by 1,2`,
      [appSchemas],
    )) {
      if (APP_ROLES.includes(r.grantee))
        s.grants[`schema ${r.nspname} -> ${r.grantee}`] = r.privs;
    }
    s.default_acl = {};
    for (const r of await q(
      `
      select pg_get_userbyid(d.defaclrole) as owner, coalesce(n.nspname,'*') as nsp, d.defaclobjtype,
             ${roleName} as grantee, string_agg(a.privilege_type, ',' order by a.privilege_type) as privs
      from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace, aclexplode(d.defaclacl) a
      where n.nspname is null or n.nspname = any($1) group by 1,2,3,4`,
      [appSchemas],
    )) {
      if (APP_ROLES.includes(r.grantee))
        s.default_acl[
          `${r.owner} ${r.nsp} ${r.defaclobjtype} -> ${r.grantee}`
        ] = r.privs;
    }

    s.sequences = Object.fromEntries(
      (
        await q(
          `
        select schemaname, sequencename, data_type::text, increment_by, min_value, max_value, cycle, cache_size
        from pg_sequences where schemaname = any($1)`,
          [appSchemas],
        )
      ).map((r) => [
        `${r.schemaname}.${r.sequencename}`,
        {
          type: r.data_type,
          inc: String(r.increment_by),
          min: String(r.min_value),
          max: String(r.max_value),
          cycle: r.cycle,
          cache: String(r.cache_size),
        },
      ]),
    );

    s.types = {};
    for (const r of await q(
      `
      select n.nspname, t.typname, t.typtype,
             (select string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid) as labels,
             format_type(t.typbasetype, t.typtypmod) as base
      from pg_type t join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = any($1) and t.typtype in ('e','d','c','r')
        and (t.typtype <> 'c' or (select relkind from pg_class where oid = t.typrelid) = 'c')
        and ${extDep.replace("%OID%", "t.oid")}`,
      [appSchemas],
    )) {
      s.types[`${r.nspname}.${r.typname}`] = {
        kind: r.typtype,
        labels: r.labels,
        base: r.typtype === "d" ? r.base : null,
      };
    }
    for (const r of await q(
      `
      select n.nspname, t.typname, string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod), ', ' order by a.attnum) as attrs
      from pg_type t join pg_namespace n on n.oid = t.typnamespace join pg_class c on c.oid = t.typrelid
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0
      where n.nspname = any($1) and t.typtype = 'c' and c.relkind = 'c' group by 1,2`,
      [appSchemas],
    )) {
      s.types[`${r.nspname}.${r.typname}`].attrs = r.attrs;
    }

    s.statistics = Object.fromEntries(
      (
        await q(
          `select n.nspname, x.stxname, pg_get_statisticsobjdef(x.oid) as def
                from pg_statistic_ext x join pg_namespace n on n.oid = x.stxnamespace where n.nspname = any($1)`,
          [appSchemas],
        )
      ).map((r) => [`${r.nspname}.${r.stxname}`, r.def]),
    );

    s.publications = {};
    for (const r of await q(
      `select pubname, puballtables, pubinsert, pubupdate, pubdelete, pubtruncate from pg_publication`,
    )) {
      s.publications[`${r.pubname}`] = {
        alltables: r.puballtables,
        ops: [
          r.pubinsert && "i",
          r.pubupdate && "u",
          r.pubdelete && "d",
          r.pubtruncate && "t",
        ]
          .filter(Boolean)
          .join(""),
      };
    }
    for (const r of await q(
      `select pubname, schemaname, tablename from pg_publication_tables`,
    )) {
      // realtime.messages_YYYY_MM_DD partitions rotate daily.
      if (ex.includes(r.schemaname)) continue;
      s.publications[`${r.pubname} table ${r.schemaname}.${r.tablename}`] =
        true;
    }

    s.event_triggers = Object.fromEntries(
      (
        await q(
          `select evtname, evtevent, evtenabled, evtfoid::regproc::text as fn from pg_event_trigger`,
        )
      ).map((r) => [
        r.evtname,
        { event: r.evtevent, enabled: r.evtenabled, fn: r.fn },
      ]),
    );

    s.buckets = {};
    if (await has("storage.buckets")) {
      // to_jsonb: older storage schemas lack some of these columns.
      for (const r of await q(`select j->>'id' as id, j->>'name' as name, (j->>'public')::bool as public,
                                      j->>'file_size_limit' as file_size_limit, j->'allowed_mime_types' as allowed_mime_types
                               from storage.buckets b, to_jsonb(b) j`)) {
        s.buckets[r.id] = {
          name: r.name,
          public: r.public,
          file_size_limit:
            r.file_size_limit == null ? null : String(r.file_size_limit),
          mime: r.allowed_mime_types,
        };
      }
    }

    s.cron = {};
    if (await has("cron.job")) {
      for (const r of await q(
        `select jobname, schedule, active, command, database from cron.job`,
      )) {
        s.cron[r.jobname ?? `(unnamed ${sha(r.command)})`] = {
          schedule: r.schedule,
          active: r.active,
          command_sha: sha(normBody(r.command)),
        };
      }
    }

    s.migrations = {};
    if (await has("supabase_migrations.schema_migrations")) {
      for (const r of await q(
        `select version, name from supabase_migrations.schema_migrations`,
      )) {
        s.migrations[r.version] = r.name ?? null;
      }
    }

    // Informational only (not diffed): sizes and row estimates for planner context.
    s.info.tables = Object.fromEntries(
      (
        await q(
          `
        select n.nspname || '.' || c.relname as t, c.reltuples::bigint as est_rows,
               pg_total_relation_size(c.oid) as bytes
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any($1) and c.relkind in ('r','p','m') order by 3 desc`,
          [appSchemas],
        )
      ).map((r) => [
        r.t,
        {
          est_rows: Number(r.est_rows),
          mb: Math.round(Number(r.bytes) / 1048576),
        },
      ]),
    );
    s.info.index_usage = Object.fromEntries(
      (
        await q(
          `select schemaname || '.' || indexrelname as i, idx_scan from pg_stat_user_indexes where schemaname = any($1)`,
          [appSchemas],
        )
      ).map((r) => [r.i, Number(r.idx_scan)]),
    );
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    await c.end();
  }
  return sortDeep(s);
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortDeep(v[k])]),
    );
  return v;
}

const DIFF_SECTIONS = [
  "meta",
  "schemas",
  "extensions",
  "settings",
  "role_settings",
  "roles",
  "relations",
  "columns",
  "column_order",
  "indexes",
  "constraints",
  "functions",
  "triggers",
  "views",
  "policies",
  "grants",
  "default_acl",
  "sequences",
  "types",
  "statistics",
  "publications",
  "event_triggers",
  "buckets",
  "cron",
  "migrations",
];

export function diff(a, b) {
  const out = [];
  for (const sec of DIFF_SECTIONS) {
    const A = a[sec] ?? {},
      B = b[sec] ?? {};
    const lines = [];
    for (const k of [
      ...new Set([...Object.keys(A), ...Object.keys(B)]),
    ].sort()) {
      const x = JSON.stringify(A[k]),
        y = JSON.stringify(B[k]);
      if (x === y) continue;
      if (!(k in B)) lines.push(`  - ${k}  ${fmt(A[k])}`);
      else if (!(k in A)) lines.push(`  + ${k}  ${fmt(B[k])}`);
      else lines.push(`  ~ ${k}\n${changed(A[k], B[k])}`);
    }
    if (lines.length)
      out.push(`## ${sec} (${lines.length})\n${lines.join("\n")}`);
  }
  return out.join("\n\n");
}
const fmt = (v) => (v && typeof v === "object" ? JSON.stringify(v) : String(v));
function changed(x, y) {
  if (
    x &&
    y &&
    typeof x === "object" &&
    typeof y === "object" &&
    !Array.isArray(x)
  ) {
    return [...new Set([...Object.keys(x), ...Object.keys(y)])]
      .filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]))
      .map((k) => `      ${k}: ${fmt(x[k])}  =>  ${fmt(y[k])}`)
      .join("\n");
  }
  return `      ${fmt(x)}  =>  ${fmt(y)}`;
}

// Print definitions of specific objects (for writing catch-up migrations).
async function defs(target, kind, keys) {
  const c = await connect(target);
  try {
    for (const key of keys) {
      let sql,
        params = [key];
      if (kind === "function")
        sql = `select pg_get_functiondef(p.oid) as d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                                      where n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' = $1`;
      else if (kind === "index")
        sql = `select pg_get_indexdef(to_regclass($1)) as d`;
      else if (kind === "view")
        sql = `select 'CREATE OR REPLACE VIEW ' || $1 || ' AS ' || pg_get_viewdef(to_regclass($1)) as d`;
      else if (kind === "trigger")
        sql = `select pg_get_triggerdef(t.oid) as d from pg_trigger t join pg_class c on c.oid=t.tgrelid
                                      join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname||'.'||t.tgname = $1`;
      else if (kind === "policy")
        sql = `select format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;', policyname, schemaname, tablename,
                                      permissive, cmd, array_to_string(roles, ', '), coalesce(' USING (' || qual || ')', ''),
                                      coalesce(' WITH CHECK (' || with_check || ')', '')) as d
                                      from pg_policies where schemaname||'.'||tablename||'.'||policyname = $1`;
      else if (kind === "constraint")
        sql = `select format('ALTER TABLE %s ADD CONSTRAINT %I %s;', k.conrelid::regclass, k.conname, pg_get_constraintdef(k.oid)) as d
                                      from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
                                      where n.nspname||'.'||c.relname||'.'||k.conname = $1`;
      else throw new Error(`unknown kind ${kind}`);
      const rows = (await c.query(sql, params)).rows;
      console.log(
        `-- ${kind} ${key}\n${rows.map((r) => r.d).join("\n") || "(not found)"}\n`,
      );
    }
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    await c.end();
  }
}

const [cmd, ...args] = process.argv.slice(2);
const write = (file, snap) => {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snap, null, 1) + "\n");
};
if (cmd === "snapshot") {
  const snap = await snapshot(args[0]);
  if (args[1]) write(args[1], snap);
  else process.stdout.write(JSON.stringify(snap, null, 1) + "\n");
} else if (cmd === "diff") {
  const [a, b] = args.map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
  const d = diff(a, b);
  console.log(d || "(no differences)");
  process.exitCode = d ? 1 : 0;
} else if (cmd === "check") {
  const dir = args[0] || "scripts/schema-drift/snapshots";
  const [p, l] = await Promise.all([snapshot("prod"), snapshot("local")]);
  write(path.join(dir, "prod.json"), p);
  write(path.join(dir, "local.json"), l);
  const d = diff(p, l);
  console.log(`# prod (-) vs local (+)\n\n${d || "(no differences)"}`);
  process.exitCode = d ? 1 : 0;
} else if (cmd === "defs") {
  await defs(args[0], args[1], args.slice(2));
} else {
  console.error(
    "usage: drift.mjs snapshot <prod|local|ENV_VAR> [out.json] | diff <a.json> <b.json> | check [dir] | defs <target> <function|index|view|trigger|policy|constraint> <key>...",
  );
  process.exitCode = 2;
}
