import { useEntity, useReplicache } from "src/replicache";
import { BaseBlock, Block, BlockProps } from "./Block";
import { v7 } from "uuid";
import { useUIState } from "src/useUIState";
import { generateKeyBetween } from "fractional-indexing";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { TrashSmall } from "components/Icons";
import { scanIndex } from "src/replicache/utils";
import { useEffect, useState } from "react";

export const TableBlock = (props: BlockProps) => {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let rows = useEntity(props.entityID, "table/row");
  let firstRowCells = useEntity(rows[0]?.data.value, "row/cell");
  let [selectedCellIndex, setSelectedCellIndex] = useState<number | undefined>(
    undefined,
  );

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
                setSelectedCellIndex={setSelectedCellIndex}
                selectedCellIndex={selectedCellIndex}
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
  selectedCellIndex: number | undefined;
  setSelectedCellIndex: (index: number) => void;
}) => {
  let rowCells = useBlocks(props.rowEntity, "row/cell");
  let selectedCell = useUIState((s) =>
    s.selectedBlocks.find((b) =>
      rowCells.some((cell) => b.value === cell.value),
    ),
  );
  let columnWidths = useEntity(props.tableEntity, "table/column-widths")?.data
    .value;

  useEffect(() => {
    if (selectedCell) {
      let foundIndex = rowCells.findIndex(
        (cell) => selectedCell.value === cell.value,
      );
      props.setSelectedCellIndex(foundIndex);
    }
  }, [selectedCell, rowCells, props.setSelectedCellIndex]);

  let gridTemplateColumnsStyle = columnWidths
    ?.map((width) =>
      width !== null && width !== undefined
        ? width + "px"
        : "minmax(104px, 1fr)",
    )
    .join(" ");

  return (
    <div
      className={`tableRow relative w-full grid  h-max items-start `}
      style={{
        gridTemplateColumns: `${gridTemplateColumnsStyle}`,
      }}
    >
      {selectedCell && (
        <DeleteRowButton
          rowEntity={props.rowEntity}
          tableEntity={props.tableEntity}
        />
      )}
      {rowCells.map((cell, index) => {
        let columnWidth = columnWidths && columnWidths[index];
        return (
          <div
            className={`
              tableCell relative
              h-full px-2 sm:px-3 py-1 sm:py-2
              border-t border-l
              first:border-l-transparent border-l-border-light
              ${props.first ? "border-t-transparent" : "border-t-border-light"}
              `}
          >
            {props.first && props.selectedCellIndex !== undefined && (
              <ColumnResizeGripper
                tableEntity={props.tableEntity}
                columnIndex={index}
                cellEntity={cell.value}
              />
            )}

            {props.first && props.selectedCellIndex === index && (
              <DeleteColumnButton
                tableEntity={props.tableEntity}
                columnIndex={props.selectedCellIndex}
              />
            )}
            <div>{columnWidth ? columnWidth : "x"}</div>
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
        props.columnIndex &&
          rep.rep?.mutate.deleteTableColumn({
            tableEntity: props.tableEntity,
            columnIndex: props.columnIndex,
          });
      }}
    >
      <TrashSmall />
    </button>
  );
}

const ColumnResizeGripper = (props: {
  tableEntity: string;
  cellEntity: string;
  columnIndex: number;
}) => {
  let widths = useEntity(props.tableEntity, "table/column-widths")?.data.value;
  let width =
    Number(
      useEntity(props.tableEntity, "table/column-widths")?.data.value[
        props.columnIndex
      ],
    ) || undefined;
  let [widthValue, setWidthValue] = useState<number | undefined>(width);

  let rep = useReplicache();

  return (
    <div className="gripper absolute p-1 -top-9 right-0 translate-x-1/2 h-fit w-fit bg-test">
      <input
        className="w-5 text-xs p-0.5"
        type="number"
        value={widthValue}
        onChange={(e) => {
          setWidthValue(e.currentTarget.valueAsNumber);
        }}
        onBlur={() => {
          widthValue &&
            rep.rep?.mutate.resizeTableColumn({
              tableEntity: props.tableEntity,
              columnIndex: props.columnIndex,
              width: widthValue,
            });
        }}
      />
    </div>
  );
};
