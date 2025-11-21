"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

export async function moveLeafletToPublication(
  leaflet_id: string,
  publication_uri: string,
  metadata: { title: string; description: string },
  entitiesToDelete: string[],
) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("uri", publication_uri)
    .single();
  if (publication?.identity_did !== identity.atp_did) return;

  await supabaseServerClient.from("leaflets_in_publications").insert({
    publication: publication_uri,
    leaflet: leaflet_id,
    doc: null,
    title: metadata.title,
    description: metadata.description,
  });

  await supabaseServerClient
    .from("entities")
    .delete()
    .in("id", entitiesToDelete);
}
