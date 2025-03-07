import { useEntity, useReplicache } from "src/replicache";
import { BaseBlock, Block, BlockProps } from "./Block";
import { v7 } from "uuid";
import { useUIState } from "src/useUIState";
import { generateKeyBetween } from "fractional-indexing";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { TrashSmall } from "components/Icons";
import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useSubscribe } from "replicache-react";
import { scanIndex } from "src/replicache/utils";

export const TableBlock = (props: BlockProps) => {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let alignment = useEntity(props.entityID, "block/text-alignment")?.data.value;

  let rows = useEntity(props.entityID, "table/row");
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let selectedColumnIndex = useSubscribe(
    rep,
    async (tx) => {
      if (!focusedEntity || focusedEntity.entityType === "page") return null;
      let rows = (
        await scanIndex(tx).eav(props.entityID, "table/row")
      ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
      for (let row of rows) {
        let cells = (
          await scanIndex(tx).eav(row.data.value, "row/cell")
        ).toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1));
        let index = cells.findIndex(
          (s) => s.data.value === focusedEntity.entityID,
        );
        if (index !== -1) return index;
      }
    },
    {
      default: null,
      dependencies: [props.entityID, focusedEntity],
    },
  );

  let [, setSelectedColumnIndex] = useState<number | undefined>(undefined);

  let columnWidths =
    useEntity(props.entityID, "table/column-widths")?.data.value || [];
  let tableWidthFixed =
    columnWidths?.find((width) => width === null) === undefined;

  return (
    <div
      className={`flex flex-col w-full
`}
    >
      <div
        className={`tableWrapper  flex flex-col max-w-full overflow-scroll focused-within:block-border-selected
        ${isSelected ? "block-border-selected" : "block-border"}
        ${tableWidthFixed ? "w-fit max-w-full" : "w-full"}
        ${
          alignment === "center"
            ? "place-self-center"
            : alignment === "left"
              ? "place-self-start"
              : alignment === "right"
                ? "place-self-end"
                : ""
        }`}
      >
        {rows &&
          rows.map((row) => {
            return (
              <Row
                rowEntity={row.data.value}
                firstRow={row.data.value === rows[0].data.value}
                pageType={props.pageType}
                tableEntity={props.entityID}
                selectedColumnIndex={selectedColumnIndex}
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
                : columnWidths.map(() => v7()),
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
  firstRow: boolean;
  pageType: "doc" | "canvas";
  tableEntity: string;
  selectedColumnIndex: number | null;
}) => {
  let rowCells = useBlocks(props.rowEntity, "row/cell");
  let selectedCell = useUIState((s) =>
    s.selectedBlocks.find((b) =>
      rowCells.some((cell) => b.value === cell.value),
    ),
  );
  let columnWidths = useEntity(props.tableEntity, "table/column-widths")?.data
    .value;

  let gridTemplateColumnsStyle = columnWidths
    ?.map((width) =>
      width !== null && width !== undefined
        ? width + "px"
        : "minmax(104px, 1fr)",
    )
    .join(" ");

  return (
    <div
      className={`tableRow relative grid  h-max items-start `}
      style={{
        gridTemplateColumns: `${gridTemplateColumnsStyle}`,
      }}
    >
      {rowCells.map((cell, columnIndex) => {
        return (
          <div
            className={`
              tableCell relative
              h-full px-2 sm:px-3 py-1 sm:py-2
              border-t border-l
              first:border-l-transparent border-l-border-light
              ${props.firstRow ? "border-t-transparent" : "border-t-border-light"}
              `}
          >
            {props.firstRow &&
              props.selectedColumnIndex !== undefined &&
              props.selectedColumnIndex === columnIndex && (
                <DeleteColumnButton
                  tableEntity={props.tableEntity}
                  columnIndex={props.selectedColumnIndex}
                />
              )}

            <ColumnResizeGripper
              tableEntity={props.tableEntity}
              columnIndex={columnIndex}
              cellEntity={cell.value}
              open={
                props.firstRow &&
                props.selectedColumnIndex !== undefined &&
                (props.selectedColumnIndex === columnIndex ||
                  props.selectedColumnIndex === columnIndex + 1)
              }
            >
              <BaseBlock
                key={cell.value}
                {...cell}
                pageType={props.pageType}
                entityID={cell.value}
                parent={props.rowEntity}
                position={cell.position}
                previousBlock={rowCells[columnIndex - 1] || null}
                nextBlock={rowCells[columnIndex + 1] || null}
                nextPosition={null}
              />
            </ColumnResizeGripper>
          </div>
        );
      })}
      {selectedCell && (
        <DeleteRowButton
          rowEntity={props.rowEntity}
          tableEntity={props.tableEntity}
        />
      )}
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
  open: boolean;
  children: React.ReactNode;
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
    <Popover.Root open={props.open}>
      <Popover.Anchor>{props.children}</Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          align="end"
          alignOffset={0}
          side="top"
          sideOffset={-20}
        >
          <div className="gripper absolute p-1 -top-9 right-0 translate-x-1/2 h-fit w-fit bg-test">
            <input
              autoFocus={false}
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
          <Popover.Close />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
