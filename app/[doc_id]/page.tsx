"use client";
import { ReplicacheProvider, useEntity, useReplicache } from "../../replicache";
import { TextBlock } from "../../components/TextBlock";

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
  return (
    <button
      onClick={() => {
        rep?.rep?.mutate.addBlock({
          parent: props.entityID,
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
    <div>
      {blocks?.map((f) => {
        let data = f.data as { type: "reference"; value: string };
        return <Block key={f.id} entityID={data.value} />;
      })}
    </div>
  );
}

function Block(props: { entityID: string }) {
  return (
    <div className="border p-2">
      <TextBlock entityID={props.entityID} />
    </div>
  );
}
