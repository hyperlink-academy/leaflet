import { describe, expect, test } from "vitest";
import { v7 } from "uuid";
import { mutations, type MutationContext } from "./mutations";
import { byTablePosition, tableCellID } from "./table";
import type { Fact } from ".";
import type { Attribute } from "./attributes";
import { createYjsText } from "src/utils/createYjsText";
import {
  Replicache,
  TEST_LICENSE_KEY,
  type WriteTransaction,
} from "replicache";
import { clientMutationContext } from "./clientMutationContext";
import { scanIndex } from "./utils";
import { createUndoManager } from "src/undoManager";
import type { ReplicacheMutators } from ".";

const axis = () => ({ entityID: v7(), factID: v7() });

function fixture() {
  const stored = new Map<string, Fact<Attribute>>();
  const entities = new Set<string>();
  const get = <A extends Attribute>(entity: string, attribute: A) =>
    Array.from(stored.values()).filter(
      (f) => f.entity === entity && f.attribute === attribute,
    ) as Fact<A>[];
  const ctx: MutationContext = {
    permission_token_id: "",
    rootEntity: "",
    sessionDid: null,
    async createEntity({ entityID }) {
      entities.add(entityID);
      return true;
    },
    scanIndex: {
      eav: async (entity, attribute) => get(entity, attribute) as never,
    },
    async assertFact(f) {
      const id = f.id ?? get(f.entity, f.attribute)[0]?.id ?? v7();
      stored.set(id, { ...f, id } as Fact<Attribute>);
    },
    async retractFact(id) {
      stored.delete(id);
    },
    async deleteEntity(entity) {
      entities.delete(entity);
      for (const [id, fact] of stored) {
        if (
          fact.entity === entity ||
          (fact.data.type.endsWith("reference") &&
            "value" in fact.data &&
            fact.data.value === entity)
        )
          stored.delete(id);
      }
    },
    async runOnServer() {},
    async runOnClient() {},
  };
  return { ctx, get, stored, entities };
}

describe("table mutations", () => {
  test("undo and redo a grid overwrite and expansion in a single Replicache step", async () => {
    const undoManager = createUndoManager();
    let rep: Replicache<ReplicacheMutators>;
    const permissionSet = v7();
    const mutators = Object.fromEntries(
      Object.entries(mutations).map(([name, mutate]) => [
        name,
        (tx: WriteTransaction, args: any) =>
          mutate(
            args,
            clientMutationContext(tx, {
              permission_token_id: "table-test",
              rootEntity: "table-test",
              sessionDid: null,
              undoManager,
              rep,
              ignoreUndo: args.ignoreUndo || tx.reason !== "initial",
              defaultEntitySet: permissionSet,
            }),
          ),
      ]),
    ) as ReplicacheMutators;
    rep = new Replicache({
      name: "table-undo-" + v7(),
      kvStore: "mem",
      licenseKey: TEST_LICENSE_KEY,
      mutators,
      pullInterval: null,
      indexes: {
        eav: { jsonPointer: "/indexes/eav", allowEmpty: true },
        vae: { jsonPointer: "/indexes/vae", allowEmpty: true },
      },
    });
    try {
      const table = v7();
      const row = axis();
      const column = axis();
      const cell = tableCellID(row.entityID, column.entityID);
      const original = createYjsText("one");
      const replacement = createYjsText("two");
      await rep.mutate.createTable({
        table,
        parent: v7(),
        permission_set: permissionSet,
        tableFactID: v7(),
        position: "a0",
        rows: [row],
        columns: [column],
        values: [[original]],
      });
      const snapshot = () =>
        rep.query(async (tx) => {
          const scan = scanIndex(tx);
          return {
            columns: (await scan.eav(table, "table/column")).length,
            value: (await scan.eav(cell, "block/text"))[0]?.data.value,
          };
        });
      await undoManager.withUndoGroup(() =>
        rep.mutate.pasteTableGrid({
          table,
          permission_set: permissionSet,
          row: row.entityID,
          column: column.entityID,
          values: [[replacement, ""]],
          extraRows: [],
          extraColumns: [axis()],
          generation: v7(),
        }),
      );
      expect(await snapshot()).toEqual({ columns: 2, value: replacement });
      await undoManager.undo();
      expect(await snapshot()).toEqual({ columns: 1, value: original });
      await undoManager.redo();
      expect(await snapshot()).toEqual({ columns: 2, value: replacement });
    } finally {
      await rep.close();
    }
  });
  test("reorders columns without moving text, pins the header and cascades deletes", async () => {
    const { ctx, get, entities } = fixture();
    const table = v7();
    const parent = v7();
    const target = { table, permission_set: v7() };
    const rows = [axis(), axis(), axis()];
    const columns = [axis(), axis()];
    await mutations.createTable(
      { ...target, parent, tableFactID: v7(), position: "a0", rows, columns },
      ctx,
    );
    const first = tableCellID(rows[0].entityID, columns[0].entityID);
    const content = createYjsText("first");
    await mutations.editTableCellText(
      { cell: first, generation: "", value: content },
      ctx,
    );
    await mutations.editTableAxis(
      {
        ...target,
        axis: "column",
        change: {
          type: "move",
          entity: columns[0].entityID,
          target: columns[1].entityID,
        },
      },
      ctx,
    );
    expect(
      get(table, "table/column")
        .sort(byTablePosition)
        .map((f) => f.data.value),
    ).toEqual(columns.map((c) => c.entityID).reverse());
    expect(get(first, "block/text")[0].data.value).toBe(content);
    await mutations.editTableAxis(
      {
        ...target,
        axis: "row",
        change: {
          type: "move",
          entity: rows[1].entityID,
          target: rows[0].entityID,
        },
      },
      ctx,
    );
    expect(get(table, "table/row").sort(byTablePosition)[0].data.value).toBe(
      rows[0].entityID,
    );
    await mutations.editTableAxis(
      {
        ...target,
        axis: "column",
        change: { type: "delete", entity: columns[0].entityID },
      },
      ctx,
    );
    expect(entities.has(first)).toBe(false);
    expect(get(rows[0].entityID, "table/row/cell")).toHaveLength(1);
    await mutations.removeBlock({ blockEntity: table, parent }, ctx);
    expect(entities.size).toBe(0);
    expect(get(parent, "card/block")).toHaveLength(0);
  });

  test("expands on paste, repairs a missing intersection, and enforces a minimum", async () => {
    const { ctx, get } = fixture();
    const table = v7();
    const target = { table, permission_set: v7() };
    const row = axis();
    const column = axis();
    await mutations.createTable(
      {
        ...target,
        parent: v7(),
        tableFactID: v7(),
        position: "a0",
        rows: [row],
        columns: [column],
      },
      ctx,
    );
    await mutations.editTableAxis(
      {
        ...target,
        axis: "row",
        change: { type: "delete", entity: row.entityID },
      },
      ctx,
    );
    expect(get(table, "table/row")).toHaveLength(1);
    const cell = tableCellID(row.entityID, column.entityID);
    await ctx.deleteEntity(cell);
    const value = createYjsText("replacement");
    await mutations.pasteTableGrid(
      {
        ...target,
        row: row.entityID,
        column: column.entityID,
        generation: "paste",
        values: [
          [value, ""],
          ["", value],
        ],
        extraRows: [axis()],
        extraColumns: [axis()],
      },
      ctx,
    );
    expect(get(table, "table/row")).toHaveLength(2);
    expect(get(table, "table/column")).toHaveLength(2);
    expect(get(cell, "block/text")[0].data.value).toBe(value);
    await mutations.editTableCellText(
      { cell, generation: "", value: createYjsText("stale") },
      ctx,
    );
    expect(get(cell, "block/text")[0].data.value).toBe(value);
  });
});
