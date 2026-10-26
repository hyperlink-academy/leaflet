"use server";

import { getAuthIdentity } from "src/auth";
import { loadPendingActions } from "src/pendingActions";
import type { PublicationsPendingActions } from "src/pendingActionKinds";
import { supabaseServerClient } from "supabase/serverClient";

// What's waiting on the viewer across the publications they own, by
// publication and then post. Only an owner acts on its posts' questions and
// replies, so contributors' publications aren't included.
export async function getMyPendingActions(): Promise<PublicationsPendingActions> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return {};
  const { data: pubs } = await supabaseServerClient
    .from("publications")
    .select("uri")
    .eq("identity_did", identity.atp_did);
  if (!pubs?.length) return {};
  const { data: posts } = await supabaseServerClient
    .from("documents_in_publications")
    .select("document, publication")
    .in(
      "publication",
      pubs.map((p) => p.uri),
    );
  const actions = await loadPendingActions(
    (posts ?? []).map((p) => p.document),
  );
  const byPublication: PublicationsPendingActions = {};
  for (const { document, publication } of posts ?? []) {
    if (actions[document])
      (byPublication[publication] ??= {})[document] = actions[document];
  }
  return byPublication;
}
