"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { withProfiles, type Contributor } from "./contributorProfiles";

export type DraftContributorError =
  | "unauthorized"
  | "draft_not_found"
  | "not_a_publication_contributor"
  | "database_error";

// A draft-contributor candidate is a publication contributor (or the owner,
// who is always a candidate but has no publication_contributors row of their
// own) enriched with profile + an owner flag.
export type DraftContributorCandidate = Contributor & { is_owner: boolean };

// Resolve the publication that owns a draft and authorize the current caller as
// either the publication owner or a confirmed contributor. Returns the
// publication uri + owner did on success.
async function authorizeDraftAccess(
  leaflet_id: string,
  callerDid: string,
): Promise<
  Result<{ publication_uri: string; owner_did: string }, DraftContributorError>
> {
  let { data: link } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("publication, publications(identity_did)")
    .eq("leaflet", leaflet_id)
    .maybeSingle();
  if (!link || !link.publication) return Err("draft_not_found");

  let ownerDid = link.publications?.identity_did;
  if (!ownerDid) return Err("draft_not_found");

  if (ownerDid !== callerDid) {
    let { data: pubContrib } = await supabaseServerClient
      .from("publication_contributors")
      .select("confirmed")
      .eq("publication_uri", link.publication)
      .eq("contributor_did", callerDid)
      .maybeSingle();
    if (!pubContrib?.confirmed) return Err("not_a_publication_contributor");
  }

  return Ok({ publication_uri: link.publication, owner_did: ownerDid });
}

// List the people eligible to be draft contributors (the publication owner +
// confirmed publication contributors), enriched with profile info. The set of
// *selected* contributors lives in Replicache (the "draft_contributors" key),
// so this only provides the candidate list for the picker + byline rendering.
export async function listDraftContributorCandidates(
  leaflet_id: string,
): Promise<Result<DraftContributorCandidate[], DraftContributorError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let access = await authorizeDraftAccess(leaflet_id, identity.atp_did);
  if (!access.ok) return access;
  let { publication_uri, owner_did } = access.value;

  let { data: pubContributors, error: pubError } = await supabaseServerClient
    .from("publication_contributors")
    .select("contributor_did, confirmed, created_at")
    .eq("publication_uri", publication_uri)
    .eq("confirmed", true)
    .order("created_at", { ascending: true });
  if (pubError) {
    console.error("[draftContributors] list contributors failed:", pubError);
    return Err("database_error");
  }

  // Candidate rows = owner first (synthesized, no publication_contributors row),
  // then confirmed contributors (deduped). created_at only drives ordering,
  // which the query already applied; the owner has no row so we use epoch.
  let candidateRows = [
    {
      contributor_did: owner_did,
      confirmed: true,
      created_at: new Date(0).toISOString(),
    },
    ...(pubContributors ?? []).filter((r) => r.contributor_did !== owner_did),
  ];

  let candidates: DraftContributorCandidate[] = (
    await withProfiles(candidateRows)
  ).map((row) => ({ ...row, is_owner: row.contributor_did === owner_did }));

  return Ok(candidates);
}
