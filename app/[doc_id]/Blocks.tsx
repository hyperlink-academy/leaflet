"use client";
import { useEntity, useReplicache } from "../../replicache";
import { TextBlock } from "../../components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
export function AddBlock(props: { entityID: string }) {
  let rep = useReplicache();
  let blocks = useEntity(props.entityID, "card/block")?.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  });
  return (
    <button
      onClick={() => {
        rep?.rep?.mutate.addBlock({
          parent: props.entityID,
          position: generateKeyBetween(null, blocks[0]?.data.position || null),
          newEntityID: crypto.randomUUID(),
        });
      }}
    >
      add block
    </button>
  );
}

export function Blocks(props: { entityID: string }) {
  let blocks = useEntity(props.entityID, "card/block");

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-1 p-2">
      {blocks
        ?.sort((a, b) => {
          return a.data.position > b.data.position ? 1 : -1;
        })
        .map((f, index, arr) => {
          return (
            <Block
              key={f.data.value}
              entityID={f.data.value}
              parent={props.entityID}
              position={f.data.position}
              previousBlock={arr[index - 1]?.data || null}
              nextPosition={arr[index + 1]?.data.position || null}
            />
          );
        })}
    </div>
  );
}

function Block(props: {
  entityID: string;
  parent: string;
  position: string;
  previousBlock: { position: string; value: string } | null;
  nextPosition: string | null;
}) {
  return (
    <div className="border p-2 w-full">
      <TextBlock {...props} />
    </div>
  );
}
