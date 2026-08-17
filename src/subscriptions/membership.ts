import { supabaseServerClient } from "supabase/serverClient";
import { publishAtprotoSubscriptionForDid } from "src/subscriptions/atproto";
import {
  checkEmailSubscriptionAllowed,
  recordEmailSubscription,
} from "src/subscriptions/email";
import type { SubscriptionSource } from "src/subscriptionSource";

// A member is also a subscriber: record an email subscription when the
// publication sends newsletters — recordEmailSubscription also mirrors the
// join onto the reader's PDS. Skipped when a confirmed subscription already
// exists (the sign-in-during-join paths subscribe before payment), so the
// subscriber events and analytics aren't doubled. When the email path doesn't
// run — already subscribed, newsletter disabled, suppressed address, or a
// failure — mirror the PDS record directly so atproto readers still see the
// subscription (it dedupes internally). Best-effort — the membership already
// billed, so a subscriber-mirroring failure must never fail its caller.
// Called from the inline join flow and from the connect-events webhook's
// activation paths (requires_action joins only become active there).
export async function ensureSubscriberRecordsForMembership(
  publicationUri: string,
  identity: { id: string; email: string | null; atp_did: string | null },
  source?: SubscriptionSource | null,
  opts?: {
    // The webhook path also fires on recoveries (past_due → active after a
    // payment retry), where flipping an `unsubscribed` row back to confirmed
    // would override a member's deliberate email opt-out. The join flow is the
    // consent moment, so only it may resubscribe.
    respectUnsubscribed?: boolean;
  },
): Promise<void> {
  try {
    if (!identity.email) {
      if (identity.atp_did)
        await publishAtprotoSubscriptionForDid(
          identity.atp_did,
          publicationUri,
        );
      return;
    }
    const [{ data: existingEmailSub }, allowed] = await Promise.all([
      supabaseServerClient
        .from("publication_email_subscribers")
        .select("state")
        .eq("publication", publicationUri)
        .eq("email", identity.email)
        .maybeSingle(),
      checkEmailSubscriptionAllowed(publicationUri, identity.email),
    ]);
    const skipForOptOut =
      opts?.respectUnsubscribed && existingEmailSub?.state === "unsubscribed";
    const recorded =
      allowed.ok && existingEmailSub?.state !== "confirmed" && !skipForOptOut
        ? await recordEmailSubscription(
            publicationUri,
            identity.email,
            identity.id,
            source,
          )
        : null;
    if (!recorded?.ok && identity.atp_did)
      await publishAtprotoSubscriptionForDid(identity.atp_did, publicationUri);
  } catch (e) {
    console.error(
      "[ensureSubscriberRecordsForMembership] mirroring failed:",
      e,
    );
  }
}
