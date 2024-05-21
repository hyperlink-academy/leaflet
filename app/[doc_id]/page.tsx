"use client";
import { ReplicacheProvider, useEntity, useReplicache } from "../../replicache";
import { TextBlock } from "../../components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";

export default function DocumentPage(props: { params: { doc_id: string } }) {
  return (
    <ReplicacheProvider name={props.params.doc_id}>
      <div className="text-blue-400">doc_id: {props.params.doc_id}</div>
      <AddBlock entityID={props.params.doc_id} />
      <Blocks entityID={props.params.doc_id} />
    </ReplicacheProvider>
  );
}

function AddBlock(props: { entityID: string }) {
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

function Blocks(props: { entityID: string }) {
  let blocks = useEntity(props.entityID, "card/block");

  return (
    <div className="mx-auto max-w-3xl">
      {blocks
        ?.sort((a, b) => {
          return a.data.position > b.data.position ? 1 : -1;
        })
        .map((f, index, arr) => {
          return (
            <Block
              key={f.id}
              entityID={f.data.value}
              parent={props.entityID}
              position={f.data.position}
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
  nextPosition: string | null;
}) {
  return (
    <div className="border p-2 w-full">
      <TextBlock {...props} />
    </div>
  );
}
