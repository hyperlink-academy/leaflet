import { useEntity, useReplicache } from "src/replicache";
import { BaseBlock, Block, BlockProps } from "./Block";
import { v7 } from "uuid";
import { useUIState } from "src/useUIState";
import { generateKeyBetween } from "fractional-indexing";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { TrashSmall } from "components/Icons";
import { scanIndex } from "src/replicache/utils";

export const TableBlock = (props: BlockProps) => {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let rows = useEntity(props.entityID, "table/row");
  let firstRowCells = useEntity(rows[0]?.data.value, "row/cell");

  return (
    <div className="w-full flex flex-col ">
      <div
        className={`table focused-within:block-border-selected ${isSelected ? "block-border-selected" : "block-border"}`}
      >
        {rows &&
          rows.map((row) => {
            return (
              <Row
                rowEntity={row.data.value}
                first={row.data.value === rows[0].data.value}
                pageType={props.pageType}
                tableEntity={props.entityID}
              />
            );
          })}
      </div>

      <button
        onClick={() => {
          rep?.mutate.addTableRow({
            tableEntity: props.entityID,
            rowEntity: v7(),
            position: generateKeyBetween(
              rows[rows.length - 1]?.data.position || null,
              null,
            ),
            permission_set: entity_set.set,
            cellEntities:
              rows.length === 0 || !rows
                ? [v7(), v7(), v7(), v7()]
                : firstRowCells.map(() => v7()),
          });
        }}
      >
        add row
      </button>
      <button
        onClick={() => {
          rep?.mutate.addTableColumn({
            tableEntity: props.entityID,
            position: generateKeyBetween(
              rows[rows.length - 1]?.data.position || null,
              null,
            ),
            cellEntities: rows?.map(() => v7()) || null,
            permission_set: entity_set.set,
          });
        }}
      >
        add column
      </button>
    </div>
  );
};

const Row = (props: {
  rowEntity: string;
  first: boolean;
  pageType: "doc" | "canvas";
  tableEntity: string;
}) => {
  let rowCells = useBlocks(props.rowEntity, "row/cell");
  let selectedCellInRow = useUIState((s) =>
    s.selectedBlocks.find((b) =>
      rowCells.some((cell) => b.value === cell.value),
    ),
  );
  let selectedCellInRowIndex = rowCells.findIndex(
    (cell) => selectedCellInRow && selectedCellInRow.value === cell.value,
  );

  // to check if a cell in the same column is selected, we need to get a list of cells that are at the same sorted index as the selected cell
  // get all cells by row

  // sort cells by position
  // make a new array of cells that are at the same index
  // check if any of those cells are selected

  return (
    <div
      className={`tableRow relative w-full grid  h-max items-start `}
      style={{
        gridTemplateColumns: `repeat(${rowCells.length}, minmax(0, 1fr))`,
      }}
    >
      {selectedCellInRow && (
        <DeleteRowButton
          rowEntity={props.rowEntity}
          tableEntity={props.tableEntity}
        />
      )}
      {rowCells.map((cell, index) => {
        return (
          <div
            className={`
              tableCell relative
              w-full h-full px-2 sm:px-3 py-1 sm:py-2
              border-t border-l
              first:border-l-transparent border-l-border-light
              ${props.first ? "border-t-transparent" : "border-t-border-light"}
              `}
          >
            {props.first && selectedCellInRowIndex === index && (
              <DeleteColumnButton
                tableEntity={props.tableEntity}
                columnIndex={selectedCellInRowIndex}
              />
            )}
            <BaseBlock
              key={cell.value}
              {...cell}
              pageType={props.pageType}
              entityID={cell.value}
              parent={props.rowEntity}
              position={cell.position}
              previousBlock={rowCells[index - 1] || null}
              nextBlock={rowCells[index + 1] || null}
              nextPosition={null}
            />
          </div>
        );
      })}
    </div>
  );
};

function DeleteRowButton(props: { rowEntity: string; tableEntity: string }) {
  let rep = useReplicache();
  return (
    <button
      className="absolute -left-6 top-1"
      onMouseDown={() => {
        rep.rep?.mutate.deleteTableRow({
          rowEntity: props.rowEntity,
          tableEntity: props.tableEntity,
        });
      }}
    >
      <TrashSmall />
    </button>
  );
}

function DeleteColumnButton(props: {
  tableEntity: string;
  columnIndex: number;
}) {
  let rep = useReplicache();
  return (
    <button
      className="absolute left-2 -top-6"
      onMouseDown={() => {
        rep.rep?.mutate.deleteTableColumn({
          tableEntity: props.tableEntity,
          columnIndex: props.columnIndex,
        });
        console.log("deleting! we hope...");
      }}
    >
      <TrashSmall />
    </button>
  );
}

function getColumnCells(tableEntity: string, index: number) {
  let rows = useEntity(tableEntity, "table/row");
  let columnCells = [];

  rows.map((row) => {
    let cells = useEntity(row.data.value, "row/cell");
    let sortedCells = cells.sort();
    columnCells.push(sortedCells[index]);
  });
}
