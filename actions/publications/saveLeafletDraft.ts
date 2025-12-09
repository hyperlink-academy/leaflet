"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

export async function saveLeafletDraft(
  leaflet_id: string,
  metadata: { title: string; description: string },
  entitiesToDelete: string[],
) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  // Save as a looseleaf draft in leaflets_to_documents with null document
  await supabaseServerClient.from("leaflets_to_documents").upsert({
    leaflet: leaflet_id,
    document: null,
    title: metadata.title,
    description: metadata.description,
  });

  await supabaseServerClient
    .from("entities")
    .delete()
    .in("id", entitiesToDelete);
}
