"use server";

import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { permission_token_rights, permission_tokens } from "drizzle/schema";
import postgres from "postgres";
export async function getShareLink(
  token: { id: string; entity_set: string },
  rootEntity: string,
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let link = await db.transaction(async (tx) => {
    // This will likely error out when if we have multiple permission
    // token rights associated with a single token
    let [tokenW] = await tx
      .select()
      .from(permission_tokens)
      .leftJoin(
        permission_token_rights,
        eq(permission_token_rights.token, permission_tokens.id),
      )
      .where(eq(permission_tokens.id, token.id));
    if (
      !tokenW.permission_token_rights ||
      tokenW.permission_token_rights.create_token !== true ||
      tokenW.permission_tokens.root_entity !== rootEntity ||
      tokenW.permission_token_rights.entity_set !== token.entity_set
    ) {
      return null;
    }

    let [existingToken] = await tx
      .select()
      .from(permission_tokens)
      .rightJoin(
        permission_token_rights,
        eq(permission_token_rights.token, permission_tokens.id),
      )
      .where(
        and(
          eq(permission_token_rights.read, true),
          eq(permission_token_rights.write, false),
          eq(permission_token_rights.create_token, false),
          eq(permission_token_rights.change_entity_set, false),
          eq(permission_token_rights.entity_set, token.entity_set),
          eq(permission_tokens.root_entity, rootEntity),
        ),
      );
    if (existingToken) {
      return existingToken.permission_tokens;
    }
    let [newToken] = await tx
      .insert(permission_tokens)
      .values({ root_entity: rootEntity })
      .returning();
    await tx.insert(permission_token_rights).values({
      entity_set: token.entity_set,
      token: newToken.id,
      read: true,
      write: false,
      create_token: false,
      change_entity_set: false,
    });
    return newToken;
  });

  client.end();
  return link;
}
