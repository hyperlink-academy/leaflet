"use client";
import { useEntity, useReplicache } from "../../replicache";
import { TextBlock } from "../../components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
import { useMemo } from "react";
import { addImage } from "../../utils/addImage";
export function AddBlock(props: { entityID: string }) {
  let rep = useReplicache();
  let blocks = useEntity(props.entityID, "card/block")?.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  });
  return (
    <button
      onMouseDown={() => {
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

export function AddImageBlock(props: { entityID: string }) {
  let rep = useReplicache();
  let blocks = useEntity(props.entityID, "card/block")?.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  });
  return (
    <input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        let file = e.currentTarget.files?.[0];
        if (!file || !rep?.rep) return;
        await addImage(file, rep.rep, {
          parent: props.entityID,
          position: generateKeyBetween(null, blocks[0]?.data.position || null),
        });
      }}
    />
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
              nextBlock={arr[index + 1]?.data || null}
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
  nextBlock: { position: string; value: string } | null;
  nextPosition: string | null;
}) {
  let image = useEntity(props.entityID, "block/image");
  let virtualBlock = useMemo(() => {
    return crypto.randomUUID();
  }, []);

  if (image)
    return (
      <>
        <div className="border p-2 w-full">
          <img
            alt={""}
            src={image.data.src}
            height={image.data.height}
            width={image.data.width}
          />
        </div>
        <div className="border p-2 w-full">
          <TextBlock
            nextBlock={props.nextBlock}
            parent={props.parent}
            previousBlock={{ value: props.entityID, position: props.position }}
            entityID={virtualBlock}
            nextPosition={props.nextPosition}
            position={generateKeyBetween(props.position, props.nextPosition)}
          />
        </div>
      </>
    );
  return (
    <div className="border p-2 w-full">
      <TextBlock {...props} />
    </div>
  );
}
