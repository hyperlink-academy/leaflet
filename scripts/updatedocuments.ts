import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent, AtUri } from "@atproto/api";
import { DidResolver } from "@atproto/identity";
import { Json } from "supabase/database.types";

let resolveDid = new DidResolver({});
async function updateDocuments() {
  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select("*")
    .is("data->postRef", null);
  if (!documents) return;
  for (let doc of documents) {
    let aturi = new AtUri(doc.uri);
    let did = await resolveDid.resolve(aturi.host);
    let service = did?.service?.[0];
    if (!service) continue;

    let agent = new AtpAgent({ service: service.serviceEndpoint as string });

    try {
      let newRecord = await agent.com.atproto.repo.getRecord({
        repo: aturi.host,
        collection: aturi.collection,
        rkey: aturi.rkey,
      });
      if (newRecord.data.value.postRef) {
        console.log("updating document " + doc.uri);
        await supabaseServerClient
          .from("documents")
          .update({ data: newRecord.data.value as Json })
          .eq("uri", doc.uri);
      }
    } catch (e) {}
  }
}
updateDocuments();
