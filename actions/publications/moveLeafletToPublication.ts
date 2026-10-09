"use server";

import { getAuthIdentity } from "src/auth";
import { isConfirmedContributor } from "src/contributorPermissions";
import { supabaseServerClient } from "supabase/serverClient";
import { addDraftToPublication } from "src/utils/addDraftToPublication";

export async function moveLeafletToPublication(
  leaflet_id: string,
  publication_uri: string,
  metadata: { title: string; description: string },
  entitiesToDelete: string[],
) {
  let identity = await getAuthIdentity();
  if (!identity || !identity.atp_did) return null;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", publication_uri)
    .single();
  if (!publication) return;
  let isOwner = publication.identity_did === identity.atp_did;
  if (
    !isOwner &&
    !(await isConfirmedContributor(publication_uri, identity.atp_did))
  )
    return;

  await addDraftToPublication({
    leaflet_id,
    publication_uri,
    actorDid: identity.atp_did,
    title: metadata.title,
    description: metadata.description,
    entitiesToDelete,
  });
}
