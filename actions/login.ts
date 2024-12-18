"use server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  email_auth_tokens,
  identities,
  entity_sets,
  entities,
  permission_tokens,
  permission_token_rights,
  permission_token_on_homepage,
} from "drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { v7 } from "uuid";

export async function loginWithEmailToken(
  localLeaflets: { token: { id: string }; added_at: string }[],
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let token_id = cookies().get("auth_token")?.value;
  if (!token_id) return null;
  let result = await db.transaction(async (tx) => {
    let [token] = await tx
      .select()
      .from(email_auth_tokens)
      .where(
        and(
          eq(email_auth_tokens.id, token_id),
          eq(email_auth_tokens.confirmed, true),
        ),
      );
    if (!token) return null;
    if (token.identity) {
      let id = token.identity;
      if (localLeaflets.length > 0)
        await tx
          .insert(permission_token_on_homepage)
          .values(
            localLeaflets.map((l) => ({
              identity: id,
              token: l.token.id,
            })),
          )
          .onConflictDoNothing();
      return token;
    }
    let [existingIdentity] = await tx
      .select()
      .from(identities)
      .where(eq(identities.email, token.email));

    let identity = existingIdentity;
    if (!existingIdentity) {
      let identityCookie = cookies().get("identity");
      if (identityCookie) {
        let [existingIdentityFromCookie] = await tx
          .select()
          .from(identities)
          .where(
            and(
              eq(identities.id, identityCookie.value),
              isNull(identities.email),
            ),
          );
        if (existingIdentityFromCookie) {
          await tx
            .update(identities)
            .set({ email: token.email })
            .where(eq(identities.id, existingIdentityFromCookie.id));
          identity = existingIdentityFromCookie;
        }
      } else {
        // Create a new entity set
        let [entity_set] = await tx.insert(entity_sets).values({}).returning();
        // Create a root-entity
        let [entity] = await tx
          .insert(entities)
          // And add it to that permission set
          .values({ set: entity_set.id, id: v7() })
          .returning();
        //Create a new permission token
        let [permissionToken] = await tx
          .insert(permission_tokens)
          .values({ root_entity: entity.id })
          .returning();
        //and give it all the permission on that entity set
        let [rights] = await tx
          .insert(permission_token_rights)
          .values({
            token: permissionToken.id,
            entity_set: entity_set.id,
            read: true,
            write: true,
            create_token: true,
            change_entity_set: true,
          })
          .returning();
        let [newIdentity] = await tx
          .insert(identities)
          .values({
            home_page: permissionToken.id,
            email: token.email,
          })
          .returning();
        identity = newIdentity;
      }
    }

    await tx
      .update(email_auth_tokens)
      .set({ identity: identity.id })
      .where(eq(email_auth_tokens.id, token_id));

    if (localLeaflets.length > 0)
      await tx
        .insert(permission_token_on_homepage)
        .values(
          localLeaflets.map((l) => ({
            identity: identity.id,
            token: l.token.id,
          })),
        )
        .onConflictDoNothing();

    return token;
  });

  client.end();
  redirect("/home");
}
