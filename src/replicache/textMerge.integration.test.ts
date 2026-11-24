import { afterAll, describe, expect, test } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import * as base64 from "base64-js";
import type { PermissionToken } from ".";
import { mutations } from "./mutations";
import { buildTableGraph, MAX_TABLE_CELLS, tableCellID } from "./table";
import { createYjsText } from "src/utils/createYjsText";

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
      "",
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
  test("saves a table expanded to the cell cap, then deletes a column", async () => {
    const { set, entity: parent, token, token_rights } = await seedEntity();
    const table = randomUUID();
    const axis = () => ({ entityID: randomUUID(), factID: randomUUID() });
    const row = axis();
    const column = axis();
    const columns = 10;
    const rows = MAX_TABLE_CELLS / columns;
    const extraRows = Array.from({ length: rows - 1 }, axis);
    const extraColumns = Array.from({ length: columns - 1 }, axis);
    const last = tableCellID(
      extraRows.at(-1)!.entityID,
      extraColumns.at(-1)!.entityID,
    );
    const value = createYjsText("persisted");
    const push = (
      mutate: (
        ctx: Parameters<typeof mutations.createTable>[1],
      ) => Promise<void>,
    ) =>
      db.transaction(async (tx) => {
        const { getContext, flush } = cachedServerMutationContext(
          tx as any,
          token,
          token_rights,
          null,
          parent,
        );
        await mutate(getContext("table-client", 1));
        await flush();
      });
    const target = { table, permission_set: set };
    try {
      await push((ctx) =>
        mutations.createTable(
          {
            ...target,
            parent,
            tableFactID: randomUUID(),
            position: "a0",
            rows: [row],
            columns: [column],
          },
          ctx,
        ),
      );
      await push((ctx) =>
        mutations.pasteTableGrid(
          {
            ...target,
            row: row.entityID,
            column: column.entityID,
            generation: randomUUID(),
            extraRows,
            extraColumns,
            values: Array.from({ length: rows }, () =>
              Array(columns).fill(value),
            ),
          },
          ctx,
        ),
      );
      const cellCount = async () =>
        Number(
          (
            await pool.query(
              `select count(*) from facts where attribute = 'table/cell/column' and entity in (select id from entities where "set" = $1)`,
              [set],
            )
          ).rows[0].count,
        );
      expect(await cellCount()).toBe(MAX_TABLE_CELLS);
      expect(await factValue(last)).toBe(value);
      await push((ctx) =>
        mutations.editTableAxis(
          {
            ...target,
            axis: "row",
            change: { type: "add", item: axis() },
          },
          ctx,
        ),
      );
      expect(await cellCount()).toBe(MAX_TABLE_CELLS);
      await push((ctx) =>
        mutations.editTableAxis(
          {
            ...target,
            axis: "column",
            change: { type: "delete", entity: extraColumns.at(-1)!.entityID },
          },
          ctx,
        ),
      );
      expect(await cellCount()).toBe(MAX_TABLE_CELLS - rows);
      expect(await factValue(last)).toBeUndefined();
    } finally {
      await pool.query('delete from entities where "set" = $1', [set]);
      await pool.query("delete from entity_sets where id = $1", [set]);
    }
  }, 30_000);

  test("inserts before an axis and duplicates current cell text and alignment", async () => {
    const { set, entity: parent, token, token_rights } = await seedEntity();
    const table = randomUUID();
    const axis = () => ({ entityID: randomUUID(), factID: randomUUID() });
    const row = axis();
    const column = axis();
    const first = axis();
    const copiedRow = axis();
    const copiedColumn = axis();
    const value = createYjsText("copied");
    const target = { table, permission_set: set };
    try {
      await db.transaction(async (tx) => {
        const { getContext, flush } = cachedServerMutationContext(
          tx as any,
          token,
          token_rights,
          null,
          parent,
        );
        const ctx = getContext("table-edit", 1);
        await mutations.createTable(
          {
            ...target,
            parent,
            tableFactID: randomUUID(),
            position: "a0",
            rows: [row],
            columns: [column],
            values: [[value]],
            header: false,
          },
          ctx,
        );
        await mutations.setTableColumnAlignment(
          { table, column: column.entityID, alignment: "right" },
          ctx,
        );
        await mutations.editTableAxis(
          {
            ...target,
            axis: "row",
            change: { type: "add", item: first, before: row.entityID },
          },
          ctx,
        );
        await mutations.editTableAxis(
          {
            ...target,
            axis: "row",
            change: { type: "add", item: copiedRow, duplicate: row.entityID },
          },
          ctx,
        );
        await mutations.editTableAxis(
          {
            ...target,
            axis: "column",
            change: {
              type: "add",
              item: copiedColumn,
              duplicate: column.entityID,
            },
          },
          ctx,
        );
        await flush();
      });
      const order = await pool.query(
        `select data->>'value' as value from facts
         where entity = $1 and attribute = 'table/row'
         order by (data->>'position') collate "C"`,
        [table],
      );
      expect(order.rows.map(({ value }) => value)).toEqual(
        [first, row, copiedRow].map(({ entityID }) => entityID),
      );
      expect(
        await factValue(tableCellID(copiedRow.entityID, column.entityID)),
      ).toBe(value);
      expect(
        await factValue(tableCellID(copiedRow.entityID, copiedColumn.entityID)),
      ).toBe(value);
      expect(
        await factValue(tableCellID(first.entityID, copiedColumn.entityID)),
      ).toBeUndefined();
      const alignment = await pool.query(
        `select data->>'value' as value from facts
         where entity = $1 and attribute = 'table/column/alignment'`,
        [copiedColumn.entityID],
      );
      expect(alignment.rows[0]?.value).toBe("right");
    } finally {
      await pool.query('delete from entities where "set" = $1', [set]);
      await pool.query("delete from entity_sets where id = $1", [set]);
    }
  });

  test("flushes a bulk write whose facts exceed one statement's bind limit", async () => {
    const { set, entity: table, token, token_rights } = await seedEntity();
    const axis = () => ({ entityID: randomUUID(), factID: randomUUID() });
    const rows = Array.from({ length: 500 }, axis);
    const columns = Array.from({ length: 10 }, axis);
    const value = createYjsText("saved");
    // Exercise the shared fact writer independently of the 1,000-cell
    // editor cap. Five bind parameters per fact would overflow one insert.
    const graph = buildTableGraph({
      table,
      rows,
      columns,
      values: rows.map(() => columns.map(() => value)),
    });
    expect(graph.facts.length * 5).toBeGreaterThan(65_535);
    try {
      await db.transaction(async (tx) => {
        const { getContext, flush } = cachedServerMutationContext(
          tx as any,
          token,
          token_rights,
          null,
          table,
        );
        const ctx = getContext("bulk-write", 1);
        await mutations.createEntity(
          graph.entities.map((entityID) => ({
            entityID,
            permission_set: set,
          })),
          ctx,
        );
        await mutations.assertFact(graph.facts, ctx);
        await flush();
      });
      expect(
        await factValue(
          tableCellID(rows.at(-1)!.entityID, columns.at(-1)!.entityID),
        ),
      ).toBe(value);
      const count = await pool.query(
        `select count(*) from facts where attribute = 'table/cell/column' and entity in (select id from entities where "set" = $1)`,
        [set],
      );
      expect(Number(count.rows[0].count)).toBe(5_000);
    } finally {
      await pool.query('delete from entities where "set" = $1', [set]);
      await pool.query("delete from entity_sets where id = $1", [set]);
    }
  }, 30_000);
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

    await runPush(token, token_rights, [{ clientID: "a", value: v2, entity }]);

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
        "",
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
