"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { revalidatePath } from "next/cache";
import { idResolver } from "src/identity";

export type ContributorRow = {
  contributor_did: string;
  confirmed: boolean;
  created_at: string;
};

export type ContributorActionError =
  | "unauthorized"
  | "not_owner"
  | "not_pro"
  | "invalid_handle"
  | "self_invite"
  | "already_contributor"
  | "not_invited"
  | "database_error";

async function loadPublication(publication_uri: string) {
  let { data } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .eq("uri", publication_uri)
    .single();
  return data;
}

async function ensureIdentity(did: string) {
  await supabaseServerClient
    .from("identities")
    .upsert({ atp_did: did }, { onConflict: "atp_did", ignoreDuplicates: true });
}

async function resolveHandleToDid(handle: string): Promise<string | null> {
  let trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) return null;
  try {
    let did = await idResolver.handle.resolve(trimmed);
    return did ?? null;
  } catch {
    return null;
  }
}

export async function inviteContributor(
  publication_uri: string,
  handle: string,
): Promise<Result<ContributorRow, ContributorActionError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let publication = await loadPublication(publication_uri);
  if (!publication) return Err("not_owner");
  if (publication.identity_did !== identity.atp_did) return Err("not_owner");

  if (!identity.entitlements?.publication_analytics) return Err("not_pro");

  let did = await resolveHandleToDid(handle);
  if (!did) return Err("invalid_handle");
  if (did === identity.atp_did) return Err("self_invite");

  let { data: existing } = await supabaseServerClient
    .from("publication_contributors")
    .select("publication_uri")
    .eq("publication_uri", publication_uri)
    .eq("contributor_did", did)
    .maybeSingle();
  if (existing) return Err("already_contributor");

  await ensureIdentity(did);

  // Insert and read the row back so created_at/confirmed come from the DB.
  let { data: inserted, error } = await supabaseServerClient
    .from("publication_contributors")
    .insert({ publication_uri, contributor_did: did, confirmed: false })
    .select("contributor_did, confirmed, created_at")
    .single();
  if (error || !inserted) {
    console.error("[contributors] insert failed:", error);
    return Err("database_error");
  }

  return Ok(inserted);
}

export async function removeContributor(
  publication_uri: string,
  contributor_did: string,
): Promise<Result<null, ContributorActionError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let publication = await loadPublication(publication_uri);
  if (!publication) return Err("not_owner");

  if (
    publication.identity_did !== identity.atp_did &&
    contributor_did !== identity.atp_did
  )
    return Err("not_owner");

  let { error } = await supabaseServerClient
    .from("publication_contributors")
    .delete()
    .eq("publication_uri", publication_uri)
    .eq("contributor_did", contributor_did);
  if (error) {
    console.error("[contributors] remove failed:", error);
    return Err("database_error");
  }

  // Also remove any draft contributor rows for drafts in this publication
  let { data: pubLeaflets } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("leaflet")
    .eq("publication", publication_uri);
  let leafletIds = (pubLeaflets ?? []).map((l) => l.leaflet);
  if (leafletIds.length > 0) {
    await supabaseServerClient
      .from("leaflet_contributors")
      .delete()
      .eq("contributor_did", contributor_did)
      .in("leaflet", leafletIds);
  }

  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
  return Ok(null);
}

export async function acceptContributorInvitation(
  publication_uri: string,
): Promise<Result<null, ContributorActionError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let { data: invite } = await supabaseServerClient
    .from("publication_contributors")
    .select("confirmed")
    .eq("publication_uri", publication_uri)
    .eq("contributor_did", identity.atp_did)
    .maybeSingle();
  if (!invite) return Err("not_invited");
  if (invite.confirmed) return Ok(null);

  let { error } = await supabaseServerClient
    .from("publication_contributors")
    .update({ confirmed: true })
    .eq("publication_uri", publication_uri)
    .eq("contributor_did", identity.atp_did);
  if (error) {
    console.error("[contributors] accept failed:", error);
    return Err("database_error");
  }
  revalidatePath("/lish/[did]/[publication]/dashboard", "layout");
  return Ok(null);
}
