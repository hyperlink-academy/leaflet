import { PubLeafletBlocksTable } from "lexicons/api";
import { TextBlockCore } from "./TextBlockCore";
import { TABLE_MIN_COLUMN_WIDTH } from "src/replicache/table";

export function PublishedTable(props: {
  block: PubLeafletBlocksTable.Main;
  index: number[];
  preview?: boolean;
  footnoteIndexMap?: Map<string, number>;
}) {
  const header = props.block.headerRow === true;
  const alignments = props.block.columnAlignments ?? [];
  const cell = (
    value: PubLeafletBlocksTable.Cell,
    row: number,
    column: number,
  ) => (
    <TextBlockCore
      plaintext={value.plaintext}
      facets={value.facets}
      index={[...props.index, row, column]}
      preview={props.preview}
      footnoteIndexMap={props.footnoteIndexMap}
    />
  );
  const cells = (
    row: PubLeafletBlocksTable.Row,
    rowIndex: number,
    headerRow: boolean,
  ) =>
    row.cells.map((value, columnIndex) => {
      const Tag = headerRow ? "th" : "td";
      const alignment = alignments[columnIndex] ?? "left";
      return (
        <Tag
          key={columnIndex}
          scope={headerRow ? "col" : undefined}
          className={`border border-border-light px-2 py-1.5 align-top wrap-anywhere whitespace-pre-wrap ${
            alignment === "right"
              ? "text-right"
              : alignment === "center"
                ? "text-center"
                : "text-left"
          } ${headerRow ? "bg-bg-light font-semibold" : ""}`}
        >
          {cell(value, rowIndex, columnIndex)}
        </Tag>
      );
    });

  const first = props.block.rows[0];
  const body = header ? props.block.rows.slice(1) : props.block.rows;
  const columns = props.block.rows.reduce(
    (width, row) => Math.max(width, row.cells.length),
    0,
  );
  return (
    <div
      className="w-full min-w-0 overflow-x-auto"
      data-table-block
      tabIndex={0}
      role="region"
      aria-label="Table"
    >
      <table
        style={{ minWidth: columns * TABLE_MIN_COLUMN_WIDTH }}
        className={`w-full table-fixed border-collapse ${
          props.block.borders === false
            ? "[&_td]:border-transparent [&_th]:border-transparent"
            : ""
        } ${
          props.block.style === "striped"
            ? "[&_tbody_tr:nth-child(even)]:bg-bg-light"
            : ""
        }`}
      >
        {header && first && (
          <thead>
            <tr>{cells(first, 0, true)}</tr>
          </thead>
        )}
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {cells(row, header ? rowIndex + 1 : rowIndex, false)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
