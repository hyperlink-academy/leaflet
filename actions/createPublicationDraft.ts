"use server";
import { getIdentityData } from "actions/getIdentityData";
import { createNewLeaflet } from "./createNewLeaflet";
import { supabaseServerClient } from "supabase/serverClient";

export async function createPublicationDraft(publication_uri: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;
  let newLeaflet = await createNewLeaflet("doc", false);
  console.log(
    await supabaseServerClient
      .from("leaflets_in_publications")
      .insert({ publication: publication_uri, leaflet: newLeaflet, doc: null }),
  );
  return newLeaflet;
}
