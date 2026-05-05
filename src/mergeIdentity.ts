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
import { Err, Ok, type Result } from "src/result";
import { backfillAtprotoSubscriptionsForIdentity } from "app/lish/subscribeToPublication";

export type MergeError =
  | "merge_not_pending"
  | "invalid_source"
  | "invalid_target"
  | "same_identity"
  | "database_error";

// Merges an email-only identity (source) into an atp-linked identity (target).
// Re-verifies invariants under a row lock so concurrent mutations can't
// invalidate them mid-transaction.
//
// NOT a server action — kept in a plain module so it can't be invoked over
// the wire. Callers must validate that the requester is authorized to merge
// these specific identities before calling.
export async function mergeEmailIdentityIntoAtpIdentity(args: {
  sourceId: string;
  targetId: string;
}): Promise<Result<null, MergeError>> {
  const { sourceId, targetId } = args;
  if (sourceId === targetId) return Err("same_identity");

  const client = await pool.connect();
  let targetAtpDid: string;
  try {
    const db = drizzle(client);
    await db.transaction(async (tx) => {
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
      targetAtpDid = lockedTarget.atp_did;

      const sourceEmail = lockedSource.email;

      // email_auth_tokens: source's tokens are stale once source is gone.
      // Caller is responsible for swapping any cookie-held auth_token to a
      // target-pointing token before calling.
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

  await backfillAtprotoSubscriptionsForIdentity(targetId, targetAtpDid!);

  return Ok(null);
}
