"use server";
import { getIdentityData } from "actions/getIdentityData";
import { createNewLeaflet } from "./createNewLeaflet";
import { supabaseServerClient } from "supabase/serverClient";

export async function createPublicationDraft(publication_uri: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .eq("uri", publication_uri)
    .single();
  if (!publication) return null;

  let isOwner = publication.identity_did === identity.atp_did;
  let isConfirmedContributor = false;
  if (!isOwner) {
    let { data: contrib } = await supabaseServerClient
      .from("publication_contributors")
      .select("confirmed")
      .eq("publication_uri", publication_uri)
      .eq("contributor_did", identity.atp_did)
      .maybeSingle();
    isConfirmedContributor = contrib?.confirmed === true;
  }
  if (!isOwner && !isConfirmedContributor) return null;

  let newLeaflet = await createNewLeaflet({
    pageType: "doc",
    redirectUser: false,
    firstBlockType: "text",
  });

  await supabaseServerClient
    .from("leaflets_in_publications")
    .insert({ publication: publication_uri, leaflet: newLeaflet, doc: null });

  // If a contributor created the draft, automatically add them as a draft
  // contributor so it shows up on their dashboard.
  if (!isOwner && newLeaflet) {
    await supabaseServerClient
      .from("leaflet_contributors")
      .upsert(
        { leaflet: newLeaflet, contributor_did: identity.atp_did },
        { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
      );
  }

  return newLeaflet;
}
