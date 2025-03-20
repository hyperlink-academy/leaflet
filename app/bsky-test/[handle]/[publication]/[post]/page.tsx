import {
  AtpBaseClient,
  PubLeafletDocument,
  PubLeafletPublication,
} from "lexicons/src";

import { getPds, IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { getIdentityData } from "actions/getIdentityData";
import { AtUri } from "@atproto/syntax";
const idResolver = new IdResolver();
export default async function PublicationPostPage(props: {
  params: { publication: string; handle: string };
}) {
  let did = await idResolver.handle.resolve(props.params.handle);
  if (!did) return <div> can't resolve handle</div>;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("*, documents_in_publications(documents(*))")
    .eq("identity_did", did)
    .eq("name", decodeURIComponent(props.params.publication))
    .single();
}
