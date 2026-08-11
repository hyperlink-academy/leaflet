"use server";

import { refresh } from "next/cache";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { getAuthIdentity } from "src/auth";
import { isConfirmedContributor } from "src/contributorPermissions";
import { copyLeafletContents } from "src/utils/copyLeafletContents";
import { getLeafletTitle } from "src/utils/getLeafletTitle";
import type { PermissionToken } from "src/replicache";
import type { Database } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";

export async function duplicateLeaflet(
  token_id: string,
): Promise<
  { token: PermissionToken; error: null } | { token: null; error: string }
> {
  let auth_token = (await cookies()).get("auth_token")?.value;

  let { data: source } = await supabaseServerClient
    .from("permission_tokens")
    .select(
      `id, root_entity, title, description,
       leaflets_in_publications(*),
       leaflets_to_documents(title, description)`,
    )
    .eq("id", token_id)
    .single();
  if (!source) return { token: null, error: "Leaflet not found" };

  let sourceTitle = getLeafletTitle(source);
  let sourceDescription =
    source.leaflets_in_publications?.[0]?.description ||
    source.leaflets_to_documents?.[0]?.description ||
    source.description ||
    null;
  let copyTitle = sourceTitle ? `${sourceTitle} (Copy)` : null;

  let { permTokenId } = await copyLeafletContents({
    rootEntity: source.root_entity,
    title: copyTitle,
    description: sourceDescription,
    // A publication draft's title is metadata the dashboard shows, so the copy
    // is already distinguishable there. Everywhere else the title is the first
    // block of the document itself, so the marker has to go in the content.
    markAsCopy: source.leaflets_in_publications.length === 0,
    // Resolves auth_token → identity in the same round trip and inserts
    // nothing when the token is missing/invalid.
    tailCte: auth_token
      ? ({ permTokenId }) => sql`, homepage_insert AS (
          INSERT INTO permission_token_on_homepage (token, identity)
          SELECT ${permTokenId}, identities.id
          FROM email_auth_tokens
          JOIN identities ON email_auth_tokens.identity = identities.id
          WHERE email_auth_tokens.id = ${auth_token}
            AND email_auth_tokens.confirmed = true
        )`
      : undefined,
  });

  await copyPublicationMembership(
    source.leaflets_in_publications,
    permTokenId,
    {
      title: copyTitle,
      description: sourceDescription,
    },
  );

  let { data: token } = await supabaseServerClient
    .from("permission_tokens")
    .select("id, root_entity, permission_token_rights(*)")
    .eq("id", permTokenId)
    .single();
  if (!token) return { token: null, error: "Couldn't duplicate this leaflet" };

  refresh();
  return { token, error: null };
}

// The copy joins the source's publication as a fresh draft — never carrying
// over the published document, the archived flag or a scheduled publish, all of
// which belong to the original post. Anyone holding the edit link can duplicate
// a leaflet, so the publication row is only copied for members; for everyone
// else the duplicate lands as a standalone leaflet.
async function copyPublicationMembership(
  rows: Database["public"]["Tables"]["leaflets_in_publications"]["Row"][],
  leaflet: string,
  metadata: { title: string | null; description: string | null },
) {
  if (rows.length === 0) return;
  let identity = await getAuthIdentity();
  if (!identity?.atp_did) return;
  let did = identity.atp_did;

  for (let row of rows) {
    let { data: publication } = await supabaseServerClient
      .from("publications")
      .select("identity_did")
      .eq("uri", row.publication)
      .single();
    if (!publication) continue;
    let isOwner = publication.identity_did === did;
    if (!isOwner && !(await isConfirmedContributor(row.publication, did)))
      continue;

    await supabaseServerClient.from("leaflets_in_publications").insert({
      publication: row.publication,
      leaflet,
      doc: null,
      title: metadata.title ?? "",
      description: metadata.description ?? row.description,
      tags: row.tags,
      cover_image: row.cover_image,
      preferences: row.preferences,
    });

    // Mirrors createPublicationDraft: a contributor's new draft needs a
    // contributor row to show up on their own dashboard.
    if (!isOwner)
      await supabaseServerClient
        .from("leaflet_contributors")
        .upsert(
          { leaflet, contributor_did: did },
          { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
        );
  }
}
