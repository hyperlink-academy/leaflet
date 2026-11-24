import { v5 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import type { FactInput } from "./mutations";
import type { Attribute } from "./attributes";
import type { Fact } from ".";
import type { DeepReadonly } from "replicache";

export const MAX_TABLE_CELLS = 1_000;

export function validTableSize(
  rows: number,
  columns: number,
  limit = MAX_TABLE_CELLS,
) {
  return rows > 0 && columns > 0 && rows * columns <= limit;
}

// The intersection is deterministic on both Replicache replicas. A missing
// intersection renders empty and can be restored when edited.
export function tableCellID(row: string, column: string) {
  return v5(column, row);
}

export function tableTextFactID(cell: string, generation = "") {
  return v5(`text:${generation}`, cell);
}

// Copies and snapshots can re-key every entity, so the stored column
// reference is authoritative. The derived ID is only used for missing cells.
export function mapTableCells(
  entries: readonly { id: string; data: { value: string } }[],
  getColumn: (cell: string) => string | undefined,
) {
  const cells = new Map<string, string>();
  for (const entry of entries.toSorted((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    const cell = entry.data.value;
    const column = getColumn(cell);
    if (column && !cells.has(column)) cells.set(column, cell);
  }
  return cells;
}

const tableFactIndexes = new WeakMap<
  readonly DeepReadonly<Fact<Attribute>>[],
  Map<string, DeepReadonly<Fact<Attribute>>[]>
>();
export function tableFactIndex(
  facts: readonly DeepReadonly<Fact<Attribute>>[],
) {
  let index = tableFactIndexes.get(facts);
  if (!index) {
    index = new Map();
    for (const fact of facts) {
      const key = `${fact.entity}/${fact.attribute}`;
      const existing = index.get(key);
      if (existing) existing.push(fact);
      else index.set(key, [fact]);
    }
    tableFactIndexes.set(facts, index);
  }
  return <A extends Attribute>(entity: string, attribute: A) =>
    (index.get(`${entity}/${attribute}`) ?? []) as DeepReadonly<Fact<A>>[];
}

export function byTablePosition(
  a: { id: string; data: { position: string } },
  b: { id: string; data: { position: string } },
) {
  if (a.data.position !== b.data.position)
    return a.data.position < b.data.position ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export type TableAxisInput = { entityID: string; factID: string };
export type TableGraphInput = {
  table: string;
  rows: TableAxisInput[];
  columns: TableAxisInput[];
  header?: boolean;
  style?: "default" | "striped";
  borders?: boolean;
  alignments?: ("left" | "center" | "right")[];
  values?: string[][];
};

export function tableCellFacts(row: string, column: string) {
  const cell = tableCellID(row, column);
  const facts = [
    {
      id: v5("row-reference", cell),
      entity: row,
      attribute: "table/row/cell",
      data: { type: "ordered-reference", value: cell, position: "a0" },
    },
    {
      id: v5("column-reference", cell),
      entity: cell,
      attribute: "table/cell/column",
      data: { type: "reference", value: column },
    },
  ] satisfies FactInput[];
  return { cell, facts };
}

export function buildTableGraph(input: TableGraphInput) {
  const { table, rows, columns } = input;
  const entities: string[] = [];
  const facts: FactInput[] = [];
  if (input.header !== false && rows[0])
    facts.push({
      id: v5("header-row", table),
      entity: table,
      attribute: "table/header-row",
      data: { type: "reference", value: rows[0].entityID },
    });
  if (input.style === "striped")
    facts.push({
      entity: table,
      attribute: "table/style",
      data: { type: "table-style-union", value: "striped" },
    });
  if (input.borders === false)
    facts.push({
      entity: table,
      attribute: "table/borders",
      data: { type: "boolean", value: false },
    });
  const columnPositions = generateNKeysBetween(null, null, columns.length);
  for (const [i, { entityID, factID }] of columns.entries()) {
    entities.push(entityID);
    facts.push({
      id: factID,
      entity: table,
      attribute: "table/column",
      data: {
        type: "ordered-reference",
        position: columnPositions[i],
        value: entityID,
      },
    });
    const alignment = input.alignments?.[i];
    if (alignment === "center" || alignment === "right")
      facts.push({
        entity: entityID,
        attribute: "table/column/alignment",
        data: { type: "text-alignment-type-union", value: alignment },
      });
  }
  const rowPositions = generateNKeysBetween(null, null, rows.length);
  for (const [i, { entityID, factID }] of rows.entries()) {
    entities.push(entityID);
    facts.push({
      id: factID,
      entity: table,
      attribute: "table/row",
      data: {
        type: "ordered-reference",
        position: rowPositions[i],
        value: entityID,
      },
    });
    for (const [j, column] of columns.entries()) {
      const { cell, facts: cellFacts } = tableCellFacts(
        entityID,
        column.entityID,
      );
      entities.push(cell);
      facts.push(...cellFacts);
      const value = input.values?.[i]?.[j];
      if (value)
        facts.push({
          id: tableTextFactID(cell),
          entity: cell,
          attribute: "block/text",
          data: { type: "text", value },
        });
    }
  }
  return { entities, facts };
}
