import { useMemo } from "react";
import { useReplicache, type Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import {
  byTablePosition,
  mapTableCells,
  tableFactIndex,
} from "src/replicache/table";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";

export type CellSnapshot = {
  id: string;
  text: string | null;
  generation: string;
};

function snapshot(table: string, get: ReturnType<typeof tableFactIndex>) {
  const rows = get(table, "table/row")
    .toSorted(byTablePosition)
    .map((f) => f.data.value);
  const columns = get(table, "table/column")
    .toSorted(byTablePosition)
    .map((f) => f.data.value);
  const cells = Object.fromEntries(
    rows.map((row) => [
      row,
      Object.fromEntries(
        Array.from(
          mapTableCells(
            get(row, "table/row/cell"),
            (cell) => get(cell, "table/cell/column")[0]?.data.value,
          ),
          ([column, id]): [string, CellSnapshot] => [
            column,
            {
              id,
              text: get(id, "block/text")[0]?.data.value ?? null,
              generation:
                get(id, "table/cell/text-generation")[0]?.data.value ?? "",
            },
          ],
        ),
      ),
    ]),
  );
  return {
    rows,
    columns,
    cells,
    alignments: columns.map(
      (column) =>
        get(column, "table/column/alignment")[0]?.data.value ?? "left",
    ),
    header:
      !!rows[0] && get(table, "table/header-row")[0]?.data.value === rows[0],
    striped: get(table, "table/style")[0]?.data.value === "striped",
    borders: get(table, "table/borders")[0]?.data.value !== false,
  };
}

export function useTableSnapshot(table: string) {
  const { rep, initialFacts } = useReplicache();
  const initial = useMemo(
    () => snapshot(table, tableFactIndex(initialFacts)),
    [table, initialFacts],
  );
  const live = useSubscribe(
    rep,
    async (tx) => {
      if (!(await tx.get("initialized"))) return null;
      const scan = scanIndex(tx);
      const read = (entity: string) => scan.eav<Attribute>(entity, "");
      const root = await read(table);
      const axes = root.filter(
        (f) => f.attribute === "table/row" || f.attribute === "table/column",
      );
      const axisFacts = (
        await Promise.all(
          axes.map((f) => read((f as Fact<"table/row">).data.value)),
        )
      ).flat();
      const cells = axisFacts.filter((f) => f.attribute === "table/row/cell");
      const cellFacts = (
        await Promise.all(
          cells.map((f) => read((f as Fact<"table/row/cell">).data.value)),
        )
      ).flat();
      return snapshot(
        table,
        tableFactIndex([...root, ...axisFacts, ...cellFacts]),
      );
    },
    { default: null, dependencies: [table] },
  );
  return { ...(live ?? initial), loaded: !!live };
}
