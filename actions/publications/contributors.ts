"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { idResolver } from "app/(app)/(home-pages)/reader/idResolver";
import { revalidatePath } from "next/cache";
import type { AppBskyActorProfile } from "@atproto/api";

export type ContributorActionError =
  | "unauthorized"
  | "not_owner"
  | "not_pro"
  | "invalid_handle"
  | "self_invite"
  | "already_contributor"
  | "not_invited"
  | "database_error";

export type ContributorRow = {
  contributor_did: string;
  confirmed: boolean;
  created_at: string;
  handle: string | null;
  display_name: string | null;
  avatar: string | null;
};

async function loadPublication(publication_uri: string) {
  let { data } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did")
    .eq("uri", publication_uri)
    .single();
  return data;
}

async function ensureIdentity(did: string) {
  let { data: existing } = await supabaseServerClient
    .from("identities")
    .select("atp_did")
    .eq("atp_did", did)
    .maybeSingle();
  if (existing) return;
  await supabaseServerClient.from("identities").insert({ atp_did: did });
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

export async function listContributors(
  publication_uri: string,
): Promise<Result<ContributorRow[], ContributorActionError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let publication = await loadPublication(publication_uri);
  if (!publication) return Err("not_owner");

  // Owners and confirmed contributors can both see the list
  let { data: selfRow } = await supabaseServerClient
    .from("publication_contributors")
    .select("confirmed")
    .eq("publication_uri", publication_uri)
    .eq("contributor_did", identity.atp_did)
    .maybeSingle();
  let isOwner = publication.identity_did === identity.atp_did;
  let isConfirmedContributor = selfRow?.confirmed === true;
  if (!isOwner && !isConfirmedContributor) return Err("not_owner");

  let { data, error } = await supabaseServerClient
    .from("publication_contributors")
    .select(
      "contributor_did, confirmed, created_at, identities(bsky_profiles(did, handle, record))",
    )
    .eq("publication_uri", publication_uri)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[contributors] listContributors failed:", error);
    return Err("database_error");
  }

  let rows: ContributorRow[] = (data ?? []).map((r) =>
    formatRow({
      contributor_did: r.contributor_did,
      confirmed: r.confirmed,
      created_at: r.created_at,
      profile: (r.identities as any)?.bsky_profiles ?? null,
    }),
  );

  return Ok(rows);
}

function formatRow(input: {
  contributor_did: string;
  confirmed: boolean;
  created_at: string;
  profile: { did: string; handle: string | null; record: unknown } | null;
}): ContributorRow {
  let record = input.profile?.record as
    | AppBskyActorProfile.Record
    | undefined;
  let avatarCid =
    record?.avatar && typeof record.avatar === "object"
      ? (record.avatar.ref as unknown as { $link?: string } | undefined)?.$link
      : undefined;
  return {
    contributor_did: input.contributor_did,
    confirmed: input.confirmed,
    created_at: input.created_at,
    handle: input.profile?.handle ?? null,
    display_name: record?.displayName ?? null,
    avatar: avatarCid
      ? `/api/atproto_images?did=${input.contributor_did}&cid=${avatarCid}`
      : null,
  };
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

  let { error } = await supabaseServerClient
    .from("publication_contributors")
    .insert({
      publication_uri,
      contributor_did: did,
      confirmed: false,
    });
  if (error) {
    console.error("[contributors] insert failed:", error);
    return Err("database_error");
  }

  // Try to enrich with profile
  let { data: profileRow } = await supabaseServerClient
    .from("bsky_profiles")
    .select("did, handle, record")
    .eq("did", did)
    .maybeSingle();

  return Ok(
    formatRow({
      contributor_did: did,
      confirmed: false,
      created_at: new Date().toISOString(),
      profile: profileRow ?? null,
    }),
  );
}

export async function removeContributor(
  publication_uri: string,
  contributor_did: string,
): Promise<Result<null, ContributorActionError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  let publication = await loadPublication(publication_uri);
  if (!publication) return Err("not_owner");

  let isOwner = publication.identity_did === identity.atp_did;
  let isSelf = contributor_did === identity.atp_did;
  if (!isOwner && !isSelf) return Err("not_owner");

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

export async function leavePublication(
  publication_uri: string,
): Promise<Result<null, ContributorActionError>> {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");
  return removeContributor(publication_uri, identity.atp_did);
}
