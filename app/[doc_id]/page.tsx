import { createClient } from "@supabase/supabase-js";
import { Fact, ReplicacheProvider } from "../../replicache";
import { Database } from "../../supabase/database.types";
import { AddBlock, Blocks } from "./Blocks";
import { Attributes } from "../../replicache/attributes";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
export default async function DocumentPage(props: {
  params: { doc_id: string };
}) {
  let { data } = await supabase.rpc("get_facts", { root: props.params.doc_id });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  return (
    <ReplicacheProvider name={props.params.doc_id} initialFacts={initialFacts}>
      <div className="text-blue-400">doc_id: {props.params.doc_id}</div>
      <AddBlock entityID={props.params.doc_id} />
      <Blocks entityID={props.params.doc_id} />
    </ReplicacheProvider>
  );
}
