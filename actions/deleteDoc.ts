"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import {
  entities,
  permission_tokens,
  permission_token_rights,
} from "drizzle/schema";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { v7 } from "uuid";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { PermissionToken } from "src/replicache";
import { revalidatePath } from "next/cache";

export async function deleteDoc(permission_token: PermissionToken) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
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
  client.end();
  return revalidatePath("/docs");
}
