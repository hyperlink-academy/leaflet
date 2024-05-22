import { ReplicacheProvider } from "../../replicache";
import { AddBlock, Blocks } from "./Blocks";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";

export default function DocumentPage(props: { params: { doc_id: string } }) {
  return (
    <ReplicacheProvider name={props.params.doc_id}>
      <div className="text-blue-400">doc_id: {props.params.doc_id}</div>
      <AddBlock entityID={props.params.doc_id} />
      <Blocks entityID={props.params.doc_id} />
    </ReplicacheProvider>
  );
}
