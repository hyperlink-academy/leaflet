"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { revalidatePath } from "next/cache";

export type DraftContributorError =
  | "unauthorized"
  | "draft_not_found"
  | "not_a_publication_contributor"
  | "database_error";

export async function addSelfAsDraftContributor(
  leaflet_id: string,
): Promise<Result<null, DraftContributorError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  // Find the publication that owns this draft
  let { data: link } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("publication, publications(identity_did)")
    .eq("leaflet", leaflet_id)
    .maybeSingle();
  if (!link || !link.publication) return Err("draft_not_found");

  // Owners are implicitly already authorized; no need to track as contributor
  let ownerDid = (link.publications as any)?.identity_did as
    | string
    | undefined;
  if (ownerDid === identity.atp_did) return Ok(null);

  // Must be a confirmed contributor of the publication
  let { data: pubContrib } = await supabaseServerClient
    .from("publication_contributors")
    .select("confirmed")
    .eq("publication_uri", link.publication)
    .eq("contributor_did", identity.atp_did)
    .maybeSingle();
  if (!pubContrib?.confirmed)
    return Err("not_a_publication_contributor");

  let { error } = await supabaseServerClient
    .from("leaflet_contributors")
    .upsert(
      { leaflet: leaflet_id, contributor_did: identity.atp_did },
      { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[draftContributors] add self failed:", error);
    return Err("database_error");
  }
  revalidatePath("/home");
  return Ok(null);
}

export async function removeSelfFromDraft(
  leaflet_id: string,
): Promise<Result<null, DraftContributorError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let { error } = await supabaseServerClient
    .from("leaflet_contributors")
    .delete()
    .eq("leaflet", leaflet_id)
    .eq("contributor_did", identity.atp_did);
  if (error) {
    console.error("[draftContributors] remove self failed:", error);
    return Err("database_error");
  }
  revalidatePath("/home");
  return Ok(null);
}
