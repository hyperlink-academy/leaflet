"use server";

import { AtpBaseClient } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
import {
  restoreOAuthSession,
  OAuthSessionError,
} from "src/atproto-oauth";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { isConfirmedContributor } from "src/contributorPermissions";
import { revalidatePath } from "next/cache";

// An authorization failure, distinct from a (recoverable) expired OAuth
// session. Callers surface session errors with a "sign in again" affordance;
// a not-authorized error should not pretend the session can be restored.
type NotAuthorizedError = { type: "not_authorized"; message: string };

type PostMutationError = OAuthSessionError | NotAuthorizedError;

// Resolve which DID owns the PDS that hosts this document and whether the
// current user (identity_did) is authorized to mutate it. Owner-on-PDS is
// always authorized; confirmed publication contributors are authorized to
// act on the owner's behalf and the records are published via the owner's
// OAuth session.
async function resolveDocumentAuthority(
  document_uri: string,
  current_did: string,
): Promise<
  | { ok: true; ownerDid: string }
  | { ok: false; error: NotAuthorizedError }
> {
  let pdsOwner = new AtUri(document_uri).host;
  if (pdsOwner === current_did) return { ok: true, ownerDid: current_did };

  let notAuthorized = {
    ok: false,
    error: {
      type: "not_authorized",
      message: "You are not authorized to modify this post.",
    },
  } as const;

  let { data: link } = await supabaseServerClient
    .from("documents_in_publications")
    .select("publication")
    .eq("document", document_uri)
    .maybeSingle();
  if (!link?.publication) return notAuthorized;
  if (!(await isConfirmedContributor(link.publication, current_did)))
    return notAuthorized;
  return { ok: true, ownerDid: pdsOwner };
}

export async function deletePost(
  document_uri: string
): Promise<{ success: true } | { success: false; error: PostMutationError }> {
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

  let authority = await resolveDocumentAuthority(
    document_uri,
    identity.atp_did,
  );
  if (!authority.ok) return { success: false, error: authority.error };

  const sessionResult = await restoreOAuthSession(authority.ownerDid);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let uri = new AtUri(document_uri);

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
): Promise<{ success: true } | { success: false; error: PostMutationError }> {
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

  let authority = await resolveDocumentAuthority(
    document_uri,
    identity.atp_did,
  );
  if (!authority.ok) return { success: false, error: authority.error };

  const sessionResult = await restoreOAuthSession(authority.ownerDid);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let uri = new AtUri(document_uri);

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
