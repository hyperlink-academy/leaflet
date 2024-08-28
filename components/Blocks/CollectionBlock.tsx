"use client";
import { generateKeyBetween } from "fractional-indexing";
import { elementId } from "src/utils/elementId";
import { v7 } from "uuid";

import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";

import { Block as BlockType } from ".";
import { Block, BlockProps } from "./Block";

export const CollectionBlock = (props: BlockProps) => {
  let { rep } = useReplicache();

  let collectionItems = useBlocks(props.entityID);

  let lastCollectionItem = collectionItems.findLast(
    (f) => !f.listData || f.listData.depth === 1,
  );

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      <NewCollectionItem
        lastBlock={lastCollectionItem || null}
        parentID={props.entityID}
      />
      {collectionItems.map((f, index, arr) => {
        let nextBlock = arr[index + 1];
        let depth = f.listData?.depth || 1;
        let nextDepth = nextBlock?.listData?.depth || 1;
        let nextPosition: string | null;
        if (depth === 1 && !nextBlock?.listData)
          nextPosition = nextBlock?.position;
        else {
          if (depth === nextDepth) nextPosition = nextBlock?.position || null;
          else nextPosition = null;
        }
        return (
          <div className="border border-border aspect-square">
            <Block
              {...f}
              key={f.value}
              entityID={f.value}
              parent={props.entityID}
              previousBlock={arr[index - 1] || null}
              nextBlock={arr[index + 1] || null}
              nextPosition={nextPosition}
            />
          </div>
        );
      })}
    </div>
  );
};

function NewCollectionItem(props: {
  lastBlock: BlockType | null;
  parentID: string;
}) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();

  // if no permission, don't show the button
  if (!entity_set.permissions.write) return null;

  return (
    <div className="flex flex-wrap items-center justify-between border border-border">
      <div
        className="h-6 hover:cursor-text italic text-tertiary grow"
        onMouseDown={async () => {
          let newEntityID = v7();
          await rep?.mutate.addBlock({
            parent: props.parentID,
            type: "text",
            factID: v7(),
            permission_set: entity_set.set,
            position: generateKeyBetween(
              props.lastBlock?.position || null,
              null,
            ),
            newEntityID,
          });

          setTimeout(() => {
            document.getElementById(elementId.block(newEntityID).text)?.focus();
          }, 10);
        }}
      >
        new!
      </div>
    </div>
  );
}
