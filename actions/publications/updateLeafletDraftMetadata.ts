"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

export async function updateLeafletDraftMetadata(
  leafletID: string,
  publication_uri: string,
  title: string,
  description: string,
) {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return null;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select()
    .eq("uri", publication_uri)
    .single();
  if (!publication || publication.identity_did !== identity.atp_did)
    return null;
  await supabaseServerClient
    .from("leaflets_in_publications")
    .update({ title, description })
    .eq("leaflet", leafletID)
    .eq("publication", publication_uri);
}
