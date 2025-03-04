import { useEntity, useReplicache } from "src/replicache";
import { BaseBlock, Block, BlockProps } from "./Block";
import { v7 } from "uuid";
import { useUIState } from "src/useUIState";
import { generateKeyBetween } from "fractional-indexing";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";

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
            console.log(row.data.value + " | " + rows[0].data.value);

            return (
              <Row
                rowEnitiy={row.data.value}
                first={row.data.value === rows[0].data.value}
                pageType={props.pageType}
              />
            );
          })}
      </div>

      <button
        onClick={() => {
          // create a row of entities

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
          console.log("Added!");
          console.log(rows);
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
  rowEnitiy: string;
  first: boolean;
  pageType: "doc" | "canvas";
}) => {
  let cells = useBlocks(props.rowEnitiy, "row/cell");

  return (
    <div
      className={`tableRow w-full grid  h-max items-start `}
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) => {
        return (
          <div
            className={`
              tableCell
              w-full h-full px-2 sm:px-3 py-1 sm:py-2
              border-t border-l
              first:border-l-transparent border-l-border-light
              ${props.first ? "border-t-transparent" : "border-t-border-light"}
              `}
          >
            <BaseBlock
              key={cell.value}
              {...cell}
              pageType={props.pageType}
              entityID={cell.value}
              parent={props.rowEnitiy}
              position={cell.position}
              previousBlock={cells[index - 1] || null}
              nextBlock={cells[index + 1] || null}
              nextPosition={null}
            />
          </div>
        );
      })}
    </div>
  );
};
