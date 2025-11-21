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

export async function deleteLeaflet(permission_token: PermissionToken) {
  const client = await pool.connect();
  const db = drizzle(client);
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

  // Check if leaflet is in any publications where user is the creator
  let { data: leafletInPubs } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("publication, publications!inner(identity_did)")
    .eq("leaflet", token);

  if (leafletInPubs) {
    for (let pub of leafletInPubs) {
      if (pub.publications.identity_did === identity.atp_did) {
        await supabaseServerClient
          .from("leaflets_in_publications")
          .update({ archived: true })
          .eq("leaflet", token)
          .eq("publication", pub.publication);
      }
    }
  }

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

  // Check if leaflet is in any publications where user is the creator
  let { data: leafletInPubs } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("publication, publications!inner(identity_did)")
    .eq("leaflet", token);

  if (leafletInPubs) {
    for (let pub of leafletInPubs) {
      if (pub.publications.identity_did === identity.atp_did) {
        await supabaseServerClient
          .from("leaflets_in_publications")
          .update({ archived: false })
          .eq("leaflet", token)
          .eq("publication", pub.publication);
      }
    }
  }

  refresh();
  return;
}
