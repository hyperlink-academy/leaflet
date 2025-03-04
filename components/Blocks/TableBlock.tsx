import { useEntity, useReplicache } from "src/replicache";
import { Block, BlockProps } from "./Block";
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
            return (
              <Row
                rowEnitiy={row.data.value}
                first={row.data.value === rows[0].data.value}
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
            cellEntities: rows
              ? firstRowCells.map(() => v7())
              : [v7(), v7(), v7(), v7()],
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

const Row = (props: { rowEnitiy: string; first: boolean }) => {
  let cells = useBlocks(props.rowEnitiy, "row/cell");

  return (
    <div
      className={`w-full grid  h-max items-start `}
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) => {
        return (
          <div
            className={`w-full border-t border-l  border-l-border-light first:border-l-transparent ${props.first ? "border-t-transparent" : "border-t-border-light"}`}
          >
            <Block
              key={cell.value}
              {...cell}
              pageType="block"
              entityID={cell.value}
              parent={props.rowEnitiy}
              position={cell.position}
              previousBlock={cells[index - 1] || null}
              nextBlock={cells[index + 1] || null}
              nextPosition={null}
            />
          </div>
        );
      })}{" "}
    </div>
  );
};
