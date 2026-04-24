"use server";

import { cookies } from "next/headers";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray, sql } from "drizzle-orm";
import {
  custom_domains,
  email_auth_tokens,
  identities,
  permission_token_on_homepage,
  publication_email_subscribers,
  user_entitlements,
  user_subscriptions,
} from "drizzle/schema";
import { pool } from "supabase/pool";
import { supabaseServerClient } from "supabase/serverClient";
import {
  AUTH_TOKEN_COOKIE,
  PENDING_MERGE_TOKEN_COOKIE,
  removePendingMergeToken,
  resolveAuthToken,
  setAuthToken,
} from "src/auth";
import { Err, Ok, type Result } from "src/result";

type MergeError =
  | "merge_not_pending"
  | "invalid_source"
  | "invalid_target"
  | "same_identity"
  | "database_error";

export async function confirmIdentityMerge(): Promise<Result<null, MergeError>> {
  const jar = await cookies();
  const sourceTokenId = jar.get(AUTH_TOKEN_COOKIE)?.value;
  const pendingTokenId = jar.get(PENDING_MERGE_TOKEN_COOKIE)?.value;

  const [source, target] = await Promise.all([
    resolveAuthToken(sourceTokenId),
    resolveAuthToken(pendingTokenId),
  ]);
  if (!source || !target) return Err("merge_not_pending");

  if (source.identity.id === target.identity.id) return Err("same_identity");
  // Source must be an unlinked email account. If it already has atp_did, a
  // merge would silently drop that Bluesky link — refuse.
  if (source.identity.atp_did || !source.identity.email)
    return Err("invalid_source");
  if (!target.identity.atp_did) return Err("invalid_target");

  const sourceId = source.identity.id;
  const targetId = target.identity.id;
  const sourceEmail = source.identity.email;

  const client = await pool.connect();
  try {
    const db = drizzle(client);
    await db.transaction(async (tx) => {
      // Re-verify invariants under a row lock. Protects against racing
      // concurrent merges or an identity being mutated between cookie
      // resolution and this transaction.
      const locked = await tx
        .select({
          id: identities.id,
          email: identities.email,
          atp_did: identities.atp_did,
        })
        .from(identities)
        .where(inArray(identities.id, [sourceId, targetId]))
        .for("update");
      const lockedSource = locked.find((r) => r.id === sourceId);
      const lockedTarget = locked.find((r) => r.id === targetId);
      if (!lockedSource || !lockedTarget)
        throw new Error("merge: identity disappeared under lock");
      if (lockedSource.atp_did !== null)
        throw new Error("merge: source has atp_did");
      if (lockedTarget.atp_did === null)
        throw new Error("merge: target missing atp_did");
      if (!lockedSource.email) throw new Error("merge: source missing email");

      // email_auth_tokens: caller is about to swap auth_token to the pending
      // token (which already points at target). Source's tokens are now stale.
      await tx
        .delete(email_auth_tokens)
        .where(eq(email_auth_tokens.identity, sourceId));

      // Target wins on (identity_id) PK collision.
      await tx.execute(sql`
        delete from user_subscriptions
        where identity_id = ${sourceId}
          and exists (select 1 from user_subscriptions where identity_id = ${targetId})
      `);
      await tx
        .update(user_subscriptions)
        .set({ identity_id: targetId })
        .where(eq(user_subscriptions.identity_id, sourceId));

      // Target wins on (identity_id, entitlement_key) PK collision.
      await tx.execute(sql`
        delete from user_entitlements
        where identity_id = ${sourceId}
          and entitlement_key in (
            select entitlement_key from user_entitlements where identity_id = ${targetId}
          )
      `);
      await tx
        .update(user_entitlements)
        .set({ identity_id: targetId })
        .where(eq(user_entitlements.identity_id, sourceId));

      // Target wins on (token, identity) PK collision.
      await tx.execute(sql`
        delete from permission_token_on_homepage
        where identity = ${sourceId}
          and token in (
            select token from permission_token_on_homepage where identity = ${targetId}
          )
      `);
      await tx
        .update(permission_token_on_homepage)
        .set({ identity: targetId })
        .where(eq(permission_token_on_homepage.identity, sourceId));

      // Target wins on unique (publication, email) collision.
      await tx.execute(sql`
        delete from ${publication_email_subscribers}
        where ${publication_email_subscribers.identity_id} = ${sourceId}
          and (${publication_email_subscribers.publication}, ${publication_email_subscribers.email}) in (
            select ${publication_email_subscribers.publication}, ${publication_email_subscribers.email}
            from ${publication_email_subscribers}
            where ${publication_email_subscribers.identity_id} = ${targetId}
          )
      `);
      await tx
        .update(publication_email_subscribers)
        .set({ identity_id: targetId })
        .where(eq(publication_email_subscribers.identity_id, sourceId));

      await tx
        .update(custom_domains)
        .set({ identity_id: targetId })
        .where(eq(custom_domains.identity_id, sourceId));

      // identities.email is unique — step via NULL so we don't collide
      // mid-swap. custom_domains.identity is nullable and cascades on update;
      // we re-set it explicitly after the final value lands because NULL→value
      // cascades don't fire.
      await tx
        .update(identities)
        .set({ email: null })
        .where(eq(identities.id, targetId));
      await tx
        .update(identities)
        .set({ email: null })
        .where(eq(identities.id, sourceId));
      await tx
        .update(identities)
        .set({ email: sourceEmail })
        .where(eq(identities.id, targetId));
      await tx
        .update(custom_domains)
        .set({ identity: sourceEmail })
        .where(eq(custom_domains.identity_id, targetId));

      await tx.delete(identities).where(eq(identities.id, sourceId));
    });
  } catch (e) {
    console.error("[mergeIdentity] transaction failed:", e);
    return Err("database_error");
  } finally {
    client.release();
  }

  await setAuthToken(pendingTokenId!);
  await removePendingMergeToken();
  return Ok(null);
}

export async function cancelIdentityMerge(): Promise<Result<null, MergeError>> {
  const jar = await cookies();
  const pendingTokenId = jar.get(PENDING_MERGE_TOKEN_COOKIE)?.value;
  if (pendingTokenId) {
    // Drop the token row so the orphan credential can't be used later.
    await supabaseServerClient
      .from("email_auth_tokens")
      .delete()
      .eq("id", pendingTokenId);
  }
  await removePendingMergeToken();
  return Ok(null);
}
