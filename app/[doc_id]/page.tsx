"use client";
import { ReplicacheProvider, useEntity, useReplicache } from "../../replicache";
import { TextEditor } from "../../components/TextEditor";

export default function DocumentPage(props: { params: { doc_id: string } }) {
  return (
    <ReplicacheProvider name={props.params.doc_id}>
      <div className="text-blue-400">doc_id: {props.params.doc_id}</div>
      <AllFacts entityID={props.params.doc_id} />
    </ReplicacheProvider>
  );
}

function AllFacts(props: { entityID: string }) {
  let blocks = useEntity(props.entityID, "block/card");

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
  let content = useEntity(props.entityID, "card/content");
  let children = useEntity(props.entityID, "block/card");
  let rep = useReplicache();
  return (
    <div className="border p-2">
      <TextEditor
        value={content?.[0]?.data.value}
        onChange={async (value) => {
          await rep.rep?.mutate.assertFact({
            entity: props.entityID,
            attribute: "card/content",
            data: { type: "text", value },
          });
        }}
      />
      {children?.map((c) => <Block key={c.id} entityID={c.data.value} />)}
    </div>
  );
}
