import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { CreateDocument, CreatePublication } from "./components";
import { AtpBaseClient, PubLeafletPagesLinearDocument } from "lexicons/src";
import { CredentialSession } from "@atproto/api";

console.log(process.env);
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
export default async function BskyPage() {
  let credentialSession = new CredentialSession(new URL("https://bsky.social"));
  await credentialSession.login({
    identifier: "awarm.space",
    password: "gaz7-pigt-3j5u-raq3",
  });
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let publications = await supabase
    .from("publications")
    .select()
    .eq("did", credentialSession.did!);
  return (
    <div>
      <div>did: {credentialSession.did}</div>
      {publications.data?.map((d) => <div key={d.rkey}>{d.name}</div>)}
      <CreateDocument />
      <CreatePublication />
    </div>
  );
}
