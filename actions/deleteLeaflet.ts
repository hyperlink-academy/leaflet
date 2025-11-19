"use server";

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

  await supabaseServerClient
    .from("permission_token_on_homepage")
    .update({ archived: true })
    .eq("token", token)
    .eq("identity", identity.id);
  return;
}

export async function unarchivePost(token: string) {
  let identity = await getIdentityData();
  if (!identity) throw new Error("No Identity");

  await supabaseServerClient
    .from("permission_token_on_homepage")
    .update({ archived: false })
    .eq("token", token)
    .eq("identity", identity.id);
  return;
}
