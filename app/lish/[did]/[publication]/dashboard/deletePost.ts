"use server";

import { AtpBaseClient } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
import { createOauthClient } from "src/atproto-oauth";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { revalidatePath } from "next/cache";

export async function deletePost(document_uri: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  const oauthClient = await createOauthClient();
  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let uri = new AtUri(document_uri);
  if (uri.host !== identity.atp_did) return;

  await Promise.all([
    agent.pub.leaflet.document.delete({
      repo: credentialSession.did,
      rkey: uri.rkey,
    }),
    supabaseServerClient.from("documents").delete().eq("uri", document_uri),
    supabaseServerClient
      .from("leaflets_in_publications")
      .delete()
      .eq("doc", document_uri),
  ]);
  console.log("called delete");

  return revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
}

export async function unpublishPost(document_uri: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  const oauthClient = await createOauthClient();
  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let uri = new AtUri(document_uri);
  if (uri.host !== identity.atp_did) return;

  await Promise.all([
    agent.pub.leaflet.document.delete({
      repo: credentialSession.did,
      rkey: uri.rkey,
    }),
    supabaseServerClient.from("documents").delete().eq("uri", document_uri),
  ]);
  return revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
}
