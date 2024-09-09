import { DeleteSmall, MoveBlockDown, MoveBlockUp } from "components/Icons";
import { useEntity, useReplicache } from "src/replicache";
import { ToolbarButton } from ".";
import { Separator, ShortcutKey } from "components/Layout";
import { metaKey } from "src/utils/metaKey";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { useUIState } from "src/useUIState";

export const BlockToolbar = (props: {
  setToolbarState: (state: "areYouSure" | "block") => void;
}) => {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let focusedEntityType = useEntity(
    focusedEntity?.entityType === "page"
      ? focusedEntity.entityID
      : focusedEntity?.parent || null,
    "page/type",
  );

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={() => {
            props.setToolbarState("areYouSure");
          }}
          tooltipContent="Delete Block"
        >
          <DeleteSmall />
        </ToolbarButton>

        {focusedEntityType?.data.value !== "canvas" ? (
          <MoveBlockButtons />
        ) : null}
      </div>
    </div>
  );
};

const MoveBlockButtons = () => {
  let { rep } = useReplicache();
  const getSortedSelection = async () => {
    let selectedBlocks = useUIState.getState().selectedBlocks;
    let siblings =
      (await rep?.query((tx) =>
        getBlocksWithType(tx, selectedBlocks[0].parent),
      )) || [];
    let sortedBlocks = siblings.filter((s) =>
      selectedBlocks.find((sb) => sb.value === s.value),
    );
    return [sortedBlocks, siblings];
  };
  return (
    <>
      <Separator classname="h-5" />
      <ToolbarButton
        onClick={async () => {
          let [sortedBlocks, siblings] = await getSortedSelection();
          if (sortedBlocks.length > 1) return;
          let block = sortedBlocks[0];
          let previousBlock =
            siblings?.[siblings.findIndex((s) => s.value === block.value) - 1];
          if (previousBlock.value === block.listData?.parent) {
            previousBlock =
              siblings?.[
                siblings.findIndex((s) => s.value === block.value) - 2
              ];
          }

          if (
            previousBlock?.listData &&
            block.listData &&
            block.listData.depth > 1 &&
            !previousBlock.listData.path.find(
              (f) => f.entity === block.listData?.parent,
            )
          ) {
            let depth = block.listData.depth;
            let newParent = previousBlock.listData.path.find(
              (f) => f.depth === depth - 1,
            );
            if (!newParent) return;
            if (useUIState.getState().foldedBlocks.includes(newParent.entity))
              useUIState.getState().toggleFold(newParent.entity);
            rep?.mutate.moveBlock({
              block: block.value,
              oldParent: block.listData?.parent,
              newParent: newParent.entity,
              position: { type: "end" },
            });
          } else {
            rep?.mutate.moveBlockUp({
              entityID: block.value,
              parent: block.listData?.parent || block.parent,
            });
          }
        }}
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Move Up</div>
            <div className="flex gap-1">
              <ShortcutKey>Shift</ShortcutKey> +{" "}
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> ↑ </ShortcutKey>
            </div>
          </div>
        }
      >
        <MoveBlockUp />
      </ToolbarButton>

      <ToolbarButton
        onClick={async () => {
          let [sortedBlocks, siblings] = await getSortedSelection();
          if (sortedBlocks.length > 1) return;
          let block = sortedBlocks[0];
          let nextBlock = siblings
            .slice(siblings.findIndex((s) => s.value === block.value) + 1)
            .find(
              (f) =>
                f.listData &&
                block.listData &&
                !f.listData.path.find((f) => f.entity === block.value),
            );
          if (
            nextBlock?.listData &&
            block.listData &&
            nextBlock.listData.depth === block.listData.depth - 1
          ) {
            if (useUIState.getState().foldedBlocks.includes(nextBlock.value))
              useUIState.getState().toggleFold(nextBlock.value);
            rep?.mutate.moveBlock({
              block: block.value,
              oldParent: block.listData?.parent,
              newParent: nextBlock.value,
              position: { type: "first" },
            });
          } else {
            rep?.mutate.moveBlockDown({
              entityID: block.value,
              parent: block.listData?.parent || block.parent,
            });
          }
        }}
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Move Down</div>
            <div className="flex gap-1">
              <ShortcutKey>Shift</ShortcutKey> +{" "}
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> ↓ </ShortcutKey>
            </div>
          </div>
        }
      >
        <MoveBlockDown />
      </ToolbarButton>
    </>
  );
};
