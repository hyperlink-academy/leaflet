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
  poll_votes_on_entity,
} from "drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { v7 } from "uuid";
import { createIdentity } from "./createIdentity";

export async function loginWithEmailToken(
  localLeaflets: { token: { id: string }; added_at: string }[],
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let token_id = (await cookies()).get("auth_token")?.value;
  let voter_token = (await cookies()).get("poll_voter_token")?.value;
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
    if (!token || !token.email) return null;
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
      let identityCookie = (await cookies()).get("identity");
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
        // Create a new identity
        identity = await createIdentity(tx, { email: token.email });
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
  if (result?.identity) {
    if (result.identity !== voter_token) {
      if (voter_token)
        await db
          .update(poll_votes_on_entity)
          .set({ voter_token: result.identity })
          .where(eq(poll_votes_on_entity.voter_token, voter_token));

      (await cookies()).set("poll_voter_token", result.identity, {
        maxAge: 60 * 60 * 24 * 365,
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }
  client.end();
}
