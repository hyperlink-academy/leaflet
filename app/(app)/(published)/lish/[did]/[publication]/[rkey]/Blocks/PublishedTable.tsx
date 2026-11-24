import { PubLeafletBlocksTable } from "lexicons/api";
import { TextBlock } from "./TextBlock";

export function PublishedTable(props: {
  block: PubLeafletBlocksTable.Main;
  index: number[];
  preview?: boolean;
  pageId?: string;
  footnoteIndexMap?: Map<string, number>;
}) {
  const header = props.block.headerRow === true;
  const alignments = props.block.columnAlignments ?? [];
  const cell = (
    value: PubLeafletBlocksTable.Cell,
    row: number,
    column: number,
  ) => (
    <TextBlock
      plaintext={value.plaintext}
      facets={value.facets}
      index={[...props.index, row, column]}
      preview={props.preview}
      pageId={props.pageId}
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
          data-index={[...props.index, rowIndex, columnIndex].join(".")}
          data-page-id={props.pageId}
          className={`min-w-[6em] max-w-[24em] px-2 py-1.5 align-top wrap-anywhere whitespace-pre-wrap ${
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
  return (
    <div
      className="w-full min-w-0 overflow-x-auto"
      data-table-block
      tabIndex={0}
      role="region"
      aria-label="Table"
    >
      <table
        className="leaflet-table w-full table-auto"
        data-bordered={props.block.borders !== false}
        data-striped={props.block.style === "striped"}
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
