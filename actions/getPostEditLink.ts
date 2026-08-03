"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { getViewerIdentity } from "actions/viewerIdentity";

// The editing token for a published post, handed out only to the post's owner.
//
// leaflets_in_publications.leaflet is a permission_tokens id, and /[leaflet_id]
// redeems it as a bearer capability with no identity check of its own — so it
// must never ride along in a published page's payload, which is one CDN entry
// shared by every reader. The owner's edit affordance fetches it here instead,
// after this function re-derives ownership server-side. The uri argument is a
// lookup key, not a claim.
export async function getPostEditLink(uri: string): Promise<string | null> {
  const identity = await getViewerIdentity();
  if (!identity?.atp_did) return null;

  const { data: document } = await supabaseServerClient
    .from("documents")
    .select(
      `uri,
       leaflets_in_publications(leaflet),
       documents_in_publications(publications(identity_did))`,
    )
    .eq("uri", uri)
    .order("publication", { referencedTable: "documents_in_publications" })
    .maybeSingle();

  const pub = document?.documents_in_publications[0]?.publications;
  if (!pub || pub.identity_did !== identity.atp_did) return null;

  return document?.leaflets_in_publications[0]?.leaflet ?? null;
}
