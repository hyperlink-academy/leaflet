"use server";
import { refresh } from "next/cache";

import { drizzle } from "drizzle-orm/node-postgres";
import {
  entities,
  permission_tokens,
  permission_token_rights,
} from "drizzle/schema";
import { eq } from "drizzle-orm";
import { PermissionToken } from "src/replicache";
import { pool } from "supabase/pool";
import { getIdentityData } from "./getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { isConfirmedContributor } from "src/contributorPermissions";

export async function deleteLeaflet(permission_token: PermissionToken) {
  const client = await pool.connect();
  const db = drizzle(client);

  // Get the current user's identity
  let identity = await getIdentityData();

  // Check publication and document ownership in one query
  let { data: tokenData } = await supabaseServerClient
    .from("permission_tokens")
    .select(
      `
      id,
      leaflets_in_publications(publication, publications!inner(identity_did)),
      leaflets_to_documents(document, documents!inner(uri))
    `,
    )
    .eq("id", permission_token.id)
    .single();

  if (tokenData) {
    // Check if leaflet is in a publication
    const leafletInPubs = tokenData.leaflets_in_publications || [];
    if (leafletInPubs.length > 0) {
      if (!identity) {
        throw new Error(
          "Unauthorized: You must be logged in to delete a leaflet in a publication",
        );
      }
      const isOwner = leafletInPubs.some(
        (pub: any) => pub.publications.identity_did === identity.atp_did,
      );
      let isMember = isOwner;
      if (!isMember && identity.atp_did) {
        for (const pub of leafletInPubs) {
          if (await isConfirmedContributor(pub.publication, identity.atp_did)) {
            isMember = true;
            break;
          }
        }
      }
      if (!isMember) {
        throw new Error(
          "Unauthorized: You must be a member of the publication to delete this leaflet",
        );
      }
    }

    // Check if there's a standalone published document
    const leafletDocs = tokenData.leaflets_to_documents || [];
    if (leafletDocs.length > 0) {
      if (!identity) {
        throw new Error(
          "Unauthorized: You must be logged in to delete a published leaflet",
        );
      }
      for (let leafletDoc of leafletDocs) {
        const docUri = leafletDoc.documents?.uri;
        // Extract the DID from the document URI (format: at://did:plc:xxx/...)
        if (docUri && identity.atp_did && !docUri.includes(identity.atp_did)) {
          throw new Error(
            "Unauthorized: You must own the published document to delete this leaflet",
          );
        }
      }
    }
  }

  await db.transaction(async (tx) => {
    let [token] = await tx
      .select()
      .from(permission_tokens)
      .leftJoin(
        permission_token_rights,
        eq(permission_tokens.id, permission_token_rights.token),
      )
      .where(eq(permission_tokens.id, permission_token.id));

    if (!token?.permission_token_rights?.write) return;
    await tx
      .delete(entities)
      .where(eq(entities.set, token.permission_token_rights.entity_set));
    await tx
      .delete(permission_tokens)
      .where(eq(permission_tokens.id, permission_token.id));
  });
  client.release();

  refresh();
  return;
}

export async function archivePost(token: string) {
  let identity = await getIdentityData();
  if (!identity) throw new Error("No Identity");

  // Archive on homepage
  await supabaseServerClient
    .from("permission_token_on_homepage")
    .update({ archived: true })
    .eq("token", token)
    .eq("identity", identity.id);

  await setArchivedInPublications(token, identity.atp_did, true);

  refresh();
  return;
}

export async function unarchivePost(token: string) {
  let identity = await getIdentityData();
  if (!identity) throw new Error("No Identity");

  // Unarchive on homepage
  await supabaseServerClient
    .from("permission_token_on_homepage")
    .update({ archived: false })
    .eq("token", token)
    .eq("identity", identity.id);

  await setArchivedInPublications(token, identity.atp_did, false);

  refresh();
  return;
}

// Archive/unarchive the leaflet in any publications where the user is a
// member (owner or confirmed contributor), so it moves in and out of the
// publication dashboard's draft list too.
async function setArchivedInPublications(
  token: string,
  atp_did: string | null,
  archived: boolean,
) {
  let { data: leafletInPubs } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("publication, publications!inner(identity_did)")
    .eq("leaflet", token);
  if (!leafletInPubs || !atp_did) return;

  for (let pub of leafletInPubs) {
    let isMember =
      pub.publications.identity_did === atp_did ||
      (await isConfirmedContributor(pub.publication, atp_did));
    if (!isMember) continue;
    await supabaseServerClient
      .from("leaflets_in_publications")
      .update({ archived })
      .eq("leaflet", token)
      .eq("publication", pub.publication);
  }
}
