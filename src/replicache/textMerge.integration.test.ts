import { afterAll, describe, expect, test } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import * as base64 from "base64-js";
import type { PermissionToken } from ".";

// These tests run against the local supabase stack (`supabase start`), like
// the pull integration tests: server-side text merging is exercised through
// the real mutation context and real fact rows.
const TEST_DB_URL =
  process.env.TEST_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// The context module transitively instantiates supabaseServerClient at import
// time, which throws without these; point it at the standard local demo stack
// (the client itself is never used by these tests). Dynamic import so the env
// is set first.
process.env.NEXT_PUBLIC_SUPABASE_API_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const { cachedServerMutationContext } = await import(
  "./cachedServerMutationContext"
);

let pool = new Pool({ connectionString: TEST_DB_URL, max: 5 });
let db = drizzle(pool);

let dbAvailable = await pool
  .query("select 1 from information_schema.tables where table_name = 'facts'")
  .then((r) => r.rowCount === 1)
  .catch(() => false);
if (!dbAvailable) {
  if (process.env.CI)
    throw new Error(
      `Text merge integration tests require a migrated database at ${TEST_DB_URL}`,
    );
  console.warn(
    `Skipping text merge integration tests: no migrated database at ${TEST_DB_URL}`,
  );
}

afterAll(async () => {
  await pool.end();
});

// A yjs doc history for one block. Snapshots encode the way the client's
// debounced flush does: the full doc state at that point.
function history(...texts: string[]) {
  let doc = new Y.Doc();
  let frag = doc.getXmlFragment("prosemirror");
  let para = new Y.XmlElement("paragraph");
  let text = new Y.XmlText();
  para.insert(0, [text]);
  frag.insert(0, [para]);
  let snapshots: string[] = [];
  let len = 0;
  for (let t of texts) {
    text.insert(len, t);
    len += t.length;
    snapshots.push(base64.fromByteArray(Y.encodeStateAsUpdate(doc)));
  }
  return snapshots;
}

function decode(value: string) {
  let doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(value));
  return doc
    .getXmlFragment("prosemirror")
    .toString()
    .replace(/<[^>]+>/g, "");
}

async function seedEntity() {
  let set = randomUUID();
  let entity = randomUUID();
  // The context takes token rights directly; no permission_tokens row needed.
  let token = randomUUID();
  await pool.query(`insert into entity_sets (id) values ($1)`, [set]);
  await pool.query(`insert into entities (id, set) values ($1, $2)`, [
    entity,
    set,
  ]);
  let token_rights = [
    {
      token,
      entity_set: set,
      read: true,
      write: true,
      create_token: false,
      change_entity_set: false,
      created_at: new Date().toISOString(),
    },
  ] as PermissionToken["permission_token_rights"];
  return { set, entity, token, token_rights };
}

async function factValue(entity: string) {
  let { rows } = await pool.query(
    `select data->>'value' as value from facts where entity = $1 and attribute = 'block/text'`,
    [entity],
  );
  return rows[0]?.value as string | undefined;
}

async function runPush(
  token: string,
  token_rights: PermissionToken["permission_token_rights"],
  writes: { clientID: string; value: string; entity: string }[],
) {
  await db.transaction(async (tx) => {
    let { getContext, flush } = cachedServerMutationContext(
      tx as any,
      token,
      token_rights,
      null,
    );
    let realLog = console.log;
    console.log = () => {};
    try {
      for (let [i, w] of writes.entries()) {
        await getContext(w.clientID, i + 1).assertFact({
          entity: w.entity,
          attribute: "block/text",
          data: { type: "text", value: w.value },
        });
      }
      await flush();
    } finally {
      console.log = realLog;
    }
  });
}

describe.skipIf(!dbAvailable)("server-side text merging", () => {
  test("a stale full-state write cannot delete newer content", async () => {
    let { entity, token, token_rights } = await seedEntity();
    let [early, final] = history("early state. ", "hours of work. ");

    // Client A got the doc to `final` on the server.
    await runPush(token, token_rights, [
      { clientID: "client-a", value: early, entity },
      { clientID: "client-a", value: final, entity },
    ]);
    expect(decode((await factValue(entity))!)).toContain("hours of work");

    // A client seeded from a stale cache pushes the early state again —
    // before the fix this replaced the row and destroyed `final`.
    await runPush(token, token_rights, [
      { clientID: "client-stale", value: early, entity },
    ]);
    let merged = decode((await factValue(entity))!);
    expect(merged).toContain("hours of work");
    expect(merged).toContain("early state");
  });

  test("newer content plus a fresh edit both survive", async () => {
    let { entity, token, token_rights } = await seedEntity();
    let [v1, v2] = history("one ", "two ");

    await runPush(token, token_rights, [
      { clientID: "a", value: v2, entity },
    ]);

    // A second client diverges from v1 (never saw "two") and adds its own text.
    let doc = new Y.Doc();
    Y.applyUpdate(doc, base64.toByteArray(v1));
    let frag = doc.getXmlFragment("prosemirror");
    let text = (frag.get(0) as Y.XmlElement).get(0) as Y.XmlText;
    text.insert(4, "three ");
    let divergent = base64.fromByteArray(Y.encodeStateAsUpdate(doc));

    await runPush(token, token_rights, [
      { clientID: "b", value: divergent, entity },
    ]);
    let merged = decode((await factValue(entity))!);
    expect(merged).toContain("two");
    expect(merged).toContain("three");
  });

  test("a batch of writes from one client merges against the stored base once and keeps the latest", async () => {
    let { entity, token, token_rights } = await seedEntity();
    let [v1, v2, v3, v4] = history("a ", "b ", "c ", "d ");
    await runPush(token, token_rights, [{ clientID: "a", value: v2, entity }]);
    // replayed batch from a client that was ahead: cumulative states v3, v4
    await runPush(token, token_rights, [
      { clientID: "b", value: v3, entity },
      { clientID: "b", value: v4, entity },
    ]);
    expect(decode((await factValue(entity))!)).toBe("a b c d ");
  });

  test("retract followed by assert does not resurrect deleted content", async () => {
    let { entity, token, token_rights } = await seedEntity();
    let [v1] = history("doomed ");
    await runPush(token, token_rights, [{ clientID: "a", value: v1, entity }]);
    let { rows } = await pool.query(
      `select id from facts where entity = $1 and attribute = 'block/text'`,
      [entity],
    );
    let factID = rows[0].id;

    let [fresh] = history("fresh ");
    await db.transaction(async (tx) => {
      let { getContext, flush } = cachedServerMutationContext(
        tx as any,
        token,
        token_rights,
        null,
      );
      let realLog = console.log;
      console.log = () => {};
      try {
        let ctx = getContext("a", 1);
        await ctx.retractFact(factID);
        await ctx.assertFact({
          entity,
          attribute: "block/text",
          data: { type: "text", value: fresh },
        });
        await flush();
      } finally {
        console.log = realLog;
      }
    });
    expect(decode((await factValue(entity))!)).toBe("fresh ");
  });
});
