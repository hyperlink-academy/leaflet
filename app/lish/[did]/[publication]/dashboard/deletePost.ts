"use server";

import { AtpBaseClient } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
import {
  restoreOAuthSession,
  OAuthSessionError,
} from "src/atproto-oauth";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { revalidatePath } from "next/cache";

export async function deletePost(
  document_uri: string
): Promise<{ success: true } | { success: false; error: OAuthSessionError }> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let uri = new AtUri(document_uri);
  if (uri.host !== identity.atp_did) {
    return { success: true };
  }

  await Promise.all([
    // Delete from both PDS collections (document exists in one or the other)
    agent.pub.leaflet.document.delete({
      repo: credentialSession.did,
      rkey: uri.rkey,
    }).catch(() => {}),
    agent.site.standard.document.delete({
      repo: credentialSession.did,
      rkey: uri.rkey,
    }).catch(() => {}),
    supabaseServerClient.from("documents").delete().eq("uri", document_uri),
    supabaseServerClient
      .from("leaflets_in_publications")
      .delete()
      .eq("doc", document_uri),
  ]);

  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
  return { success: true };
}

export async function unpublishPost(
  document_uri: string
): Promise<{ success: true } | { success: false; error: OAuthSessionError }> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let uri = new AtUri(document_uri);
  if (uri.host !== identity.atp_did) {
    return { success: true };
  }

  await Promise.all([
    // Delete from both PDS collections (document exists in one or the other)
    agent.pub.leaflet.document.delete({
      repo: credentialSession.did,
      rkey: uri.rkey,
    }).catch(() => {}),
    agent.site.standard.document.delete({
      repo: credentialSession.did,
      rkey: uri.rkey,
    }).catch(() => {}),
    supabaseServerClient.from("documents").delete().eq("uri", document_uri),
  ]);
  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
  return { success: true };
}
