"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { revalidatePath } from "next/cache";
import { getProfiles } from "src/identity";
import { buildRow, type ContributorRow } from "./contributors";

export type DraftContributorError =
  | "unauthorized"
  | "draft_not_found"
  | "not_a_publication_contributor"
  | "invalid_contributor"
  | "database_error";

// A draft-contributor candidate is a publication contributor row plus a flag
// marking the publication owner (who is always a candidate but has no
// publication_contributors row of their own).
export type DraftContributorCandidate = ContributorRow & {
  is_owner: boolean;
};

export type DraftContributorsData = {
  owner_did: string;
  selected_dids: string[];
  candidates: DraftContributorCandidate[];
};

// Resolve the publication that owns a draft and authorize the current caller as
// either the publication owner or a confirmed contributor. Returns the
// publication uri + owner did on success.
async function authorizeDraftAccess(
  leaflet_id: string,
  callerDid: string,
): Promise<
  Result<
    { publication_uri: string; owner_did: string },
    DraftContributorError
  >
> {
  let { data: link } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("publication, publications(identity_did)")
    .eq("leaflet", leaflet_id)
    .maybeSingle();
  if (!link || !link.publication) return Err("draft_not_found");

  let ownerDid = (link.publications as any)?.identity_did as string | undefined;
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

export async function addSelfAsDraftContributor(
  leaflet_id: string,
): Promise<Result<null, DraftContributorError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  // authorizeDraftAccess validates the draft exists and the caller is the
  // owner or a confirmed publication contributor.
  let access = await authorizeDraftAccess(leaflet_id, identity.atp_did);
  if (!access.ok) return access;
  // Owners are implicitly already authorized; no need to track as contributor
  if (access.value.owner_did === identity.atp_did) return Ok(null);

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
  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
  return Ok(null);
}

// List the draft's current contributor dids plus the set of people who are
// eligible to be contributors (the publication owner + confirmed publication
// contributors), enriched with profile info for rendering.
export async function listDraftContributors(
  leaflet_id: string,
): Promise<Result<DraftContributorsData, DraftContributorError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let access = await authorizeDraftAccess(leaflet_id, identity.atp_did);
  if (!access.ok) return access;
  let { publication_uri, owner_did } = access.value;

  // These two reads are independent, so run them concurrently.
  let [
    { data: selectedRows, error: selectedError },
    { data: pubContributors, error: pubError },
  ] = await Promise.all([
    supabaseServerClient
      .from("leaflet_contributors")
      .select("contributor_did")
      .eq("leaflet", leaflet_id),
    supabaseServerClient
      .from("publication_contributors")
      .select("contributor_did, created_at")
      .eq("publication_uri", publication_uri)
      .eq("confirmed", true)
      .order("created_at", { ascending: true }),
  ]);
  if (selectedError) {
    console.error("[draftContributors] list selected failed:", selectedError);
    return Err("database_error");
  }
  if (pubError) {
    console.error("[draftContributors] list contributors failed:", pubError);
    return Err("database_error");
  }

  // Candidate rows = owner first (synthesized, no publication_contributors row),
  // then confirmed contributors (deduped). created_at is only used for ordering,
  // which the query already applies; the owner has no row so we use "now".
  let candidateRows: { contributor_did: string; created_at: string }[] = [
    { contributor_did: owner_did, created_at: new Date(0).toISOString() },
  ];
  let seen = new Set<string>([owner_did]);
  for (let row of pubContributors ?? []) {
    if (seen.has(row.contributor_did)) continue;
    seen.add(row.contributor_did);
    candidateRows.push(row);
  }

  let profiles = await getProfiles(candidateRows.map((r) => r.contributor_did));
  let candidates: DraftContributorCandidate[] = candidateRows.map((row) => ({
    ...buildRow(
      {
        contributor_did: row.contributor_did,
        confirmed: true,
        created_at: row.created_at,
      },
      profiles.get(row.contributor_did) ?? null,
    ),
    is_owner: row.contributor_did === owner_did,
  }));

  return Ok({
    owner_did,
    selected_dids: (selectedRows ?? []).map((r) => r.contributor_did),
    candidates,
  });
}

// Add a single did as a draft contributor. The did must be the publication
// owner or a confirmed publication contributor.
export async function addDraftContributor(
  leaflet_id: string,
  contributor_did: string,
): Promise<Result<null, DraftContributorError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let access = await authorizeDraftAccess(leaflet_id, identity.atp_did);
  if (!access.ok) return access;
  let { publication_uri, owner_did } = access.value;

  if (contributor_did !== owner_did) {
    let { data: pubContrib } = await supabaseServerClient
      .from("publication_contributors")
      .select("confirmed")
      .eq("publication_uri", publication_uri)
      .eq("contributor_did", contributor_did)
      .maybeSingle();
    if (!pubContrib?.confirmed) return Err("invalid_contributor");
  }

  let { error } = await supabaseServerClient
    .from("leaflet_contributors")
    .upsert(
      { leaflet: leaflet_id, contributor_did },
      { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[draftContributors] add failed:", error);
    return Err("database_error");
  }
  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
  return Ok(null);
}

// Remove a single did from the draft's contributors.
export async function removeDraftContributor(
  leaflet_id: string,
  contributor_did: string,
): Promise<Result<null, DraftContributorError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let access = await authorizeDraftAccess(leaflet_id, identity.atp_did);
  if (!access.ok) return access;

  let { error } = await supabaseServerClient
    .from("leaflet_contributors")
    .delete()
    .eq("leaflet", leaflet_id)
    .eq("contributor_did", contributor_did);
  if (error) {
    console.error("[draftContributors] remove failed:", error);
    return Err("database_error");
  }
  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
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
  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
  return Ok(null);
}
