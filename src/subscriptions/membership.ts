import { supabaseServerClient } from "supabase/serverClient";
import { publishAtprotoSubscriptionForDid } from "src/subscriptions/atproto";
import {
  checkEmailSubscriptionAllowed,
  recordEmailSubscription,
} from "src/subscriptions/email";
import type { SubscriptionSource } from "src/subscriptionSource";

// A member is also a subscriber. Called from the inline join flow and from the
// connect-events webhook's activation paths (requires_action joins only become
// active there). Best-effort — the membership already billed, so a
// subscriber-mirroring failure must never fail its caller.
//
// The email subscription is skipped when a confirmed one already exists (the
// sign-in-during-join paths subscribe before payment), so subscriber events and
// analytics aren't doubled, and when the publication can't mail the address at
// all. recordEmailSubscription mirrors the join onto the reader's PDS itself;
// when it didn't run, publish directly so atproto readers still see the
// subscription (it dedupes internally).
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
    let recorded = false;
    if (identity.email) {
      const email = identity.email;
      const [{ data: existing }, allowed] = await Promise.all([
        supabaseServerClient
          .from("publication_email_subscribers")
          .select("state")
          .eq("publication", publicationUri)
          .eq("email", email)
          .maybeSingle(),
        checkEmailSubscriptionAllowed(publicationUri, email),
      ]);
      const skip =
        !allowed.ok ||
        existing?.state === "confirmed" ||
        (opts?.respectUnsubscribed && existing?.state === "unsubscribed");
      if (!skip)
        recorded = (
          await recordEmailSubscription(
            publicationUri,
            email,
            identity.id,
            source,
          )
        ).ok;
    }
    if (!recorded && identity.atp_did)
      await publishAtprotoSubscriptionForDid(identity.atp_did, publicationUri);
  } catch (e) {
    console.error(
      "[ensureSubscriberRecordsForMembership] mirroring failed:",
      e,
    );
  }
}
