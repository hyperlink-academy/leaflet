import { supabaseServerClient } from "supabase/serverClient";
import { publishAtprotoSubscriptionForDid } from "src/subscriptions/atproto";
import { parseActionFromSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import {
  getSuppression,
  deleteSuppression,
} from "src/utils/postmarkSuppressions";
import { Ok, Err, type Result } from "src/result";
import { after } from "next/server";
import { trackSubscriptionEvent } from "src/subscriptionAnalytics";
import {
  sanitizeSubscriptionSource,
  type SubscriptionSource,
} from "src/subscriptionSource";

export async function recordEmailSubscription(
  publicationUri: string,
  email: string,
  identityId: string,
  source?: SubscriptionSource | null,
): Promise<Result<null, "database_error">> {
  const { data: existing } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("state")
    .eq("publication", publicationUri)
    .eq("email", email)
    .maybeSingle();
  const wasUnsubscribed = existing?.state === "unsubscribed";

  const { data: subscriber, error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .upsert(
      {
        publication: publicationUri,
        email,
        identity_id: identityId,
        state: "confirmed",
        confirmation_code: null,
        confirmed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: "publication,email" },
    )
    .select("id")
    .single();
  if (error || !subscriber) {
    console.error("[recordEmailSubscription] upsert failed:", error);
    return Err("database_error");
  }

  const { error: eventsError } = await supabaseServerClient
    .from("publication_email_subscriber_events")
    .insert([
      {
        subscriber: subscriber.id,
        publication: publicationUri,
        event_type: wasUnsubscribed ? "resubscribed" : "subscribe_requested",
      },
      {
        subscriber: subscriber.id,
        publication: publicationUri,
        event_type: "confirmed",
      },
    ]);
  if (eventsError) {
    console.error("[recordEmailSubscription] events failed:", eventsError);
    return Err("database_error");
  }

  const { data: confirmedIdentity } = await supabaseServerClient
    .from("identities")
    .select("atp_did")
    .eq("id", identityId)
    .maybeSingle();
  // The atproto mirror below is the same subscription, not a second one — only
  // the email event is tracked.
  after(() =>
    trackSubscriptionEvent({
      event: "subscribe",
      method: "email",
      origin: "app",
      publicationUri,
      subscriberDid: confirmedIdentity?.atp_did,
      subscriberEmail: email,
      source,
    }),
  );

  if (confirmedIdentity?.atp_did) {
    await publishAtprotoSubscriptionForDid(
      confirmedIdentity.atp_did,
      publicationUri,
    );
  }

  return Ok(null);
}

// Flips the given subscriber rows to `unsubscribed` and logs events. This is
// both "turn off email notifications" and the email half of a full
// unsubscribe: with the atproto record carrying "subscribed" for linked
// accounts, an email row's only job is delivery, so muting and unsubscribing
// the email channel are the same state. Re-enabling goes back through
// recordEmailSubscription (the resubscribe path), which restores `confirmed`.
export async function disableEmailRows(
  publicationUri: string,
  rowIds: string[],
  tracking: { atp_did?: string | null; email?: string | null },
): Promise<Result<null, "database_error">> {
  if (rowIds.length === 0) return Ok(null);
  const nowIso = new Date().toISOString();
  const [{ error: updateError }, { error: eventError }] = await Promise.all([
    supabaseServerClient
      .from("publication_email_subscribers")
      .update({
        state: "unsubscribed",
        unsubscribed_at: nowIso,
        confirmation_code: null,
      })
      .in("id", rowIds),
    supabaseServerClient.from("publication_email_subscriber_events").insert(
      rowIds.map((id) => ({
        subscriber: id,
        publication: publicationUri,
        event_type: "unsubscribe_requested",
      })),
    ),
  ]);
  if (updateError || eventError) {
    console.error(
      "[disableEmailRows] update/event failed:",
      updateError ?? eventError,
    );
    return Err("database_error");
  }
  after(() =>
    trackSubscriptionEvent({
      event: "unsubscribe",
      method: "email",
      origin: "app",
      publicationUri,
      subscriberDid: tracking.atp_did,
      subscriberEmail: tracking.email,
    }),
  );
  return Ok(null);
}

// Identity may have multiple matching subscriber rows historically (different
// emails tied to the same identity, e.g. a linked address that predates an
// email change) — act on all of them so one click stops all future mail.
export async function disableEmailForIdentity(
  publicationUri: string,
  identity: { id: string; atp_did: string | null; email: string | null },
): Promise<Result<null, "database_error">> {
  const { data: subscribers, error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, state")
    .eq("publication", publicationUri)
    .eq("identity_id", identity.id);
  if (error) {
    console.error("[disableEmailForIdentity] read failed:", error);
    return Err("database_error");
  }
  const active = (subscribers ?? []).filter((s) => s.state !== "unsubscribed");
  return disableEmailRows(
    publicationUri,
    active.map((s) => s.id),
    identity,
  );
}

export async function checkEmailSubscriptionAllowed(
  publicationUri: string,
  email: string,
): Promise<
  Result<
    null,
    | "newsletter_disabled"
    | "suppressed_spam_complaint"
    | "suppression_delete_failed"
  >
> {
  const { data: settings } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .select("enabled")
    .eq("publication", publicationUri)
    .maybeSingle();
  if (!settings?.enabled) return Err("newsletter_disabled");

  const suppression = await getSuppression(email);
  if (suppression?.reason === "SpamComplaint") {
    return Err("suppressed_spam_complaint");
  }
  if (
    suppression?.reason === "HardBounce" ||
    suppression?.reason === "ManualSuppression"
  ) {
    const deleted = await deleteSuppression(email);
    if (!deleted) return Err("suppression_delete_failed");
  }
  return Ok(null);
}

// Runs the after-sign-in action (parsed from the `action` search param) for a
// just-authenticated email identity and returns where to send the browser. When
// there is no action — or no authenticated identity — the redirect is returned
// unchanged; only a recognized action does extra work. `subscribe` is currently
// the only handler. Called from the email-login flow's two mutually-exclusive
// entry points: the reused-session fast path in app/api/auth/email-login/route.ts
// and the fresh-confirm path in confirmEmailLogin.
export async function applyAfterSignInAction(
  action: string | null,
  redirect: string,
  email: string | null,
  identityId: string | null,
): Promise<string> {
  const parsed = parseActionFromSearchParam(action);
  if (!parsed || !email || !identityId) return redirect;

  switch (parsed.action) {
    case "subscribe": {
      const target = new URL(redirect);
      const allowed = await checkEmailSubscriptionAllowed(
        parsed.publication,
        email,
      );
      if (!allowed.ok) {
        target.searchParams.set("subscribe_email_error", allowed.error);
        return target.toString();
      }
      const recorded = await recordEmailSubscription(
        parsed.publication,
        email,
        identityId,
        sanitizeSubscriptionSource(parsed.source),
      );
      if (!recorded.ok) {
        target.searchParams.set("subscribe_email_error", recorded.error);
        return target.toString();
      }
      // Paid-membership joins carry ?join_tier in the redirect itself, so the
      // reader resumes payment where they left off rather than detouring here.
      target.searchParams.set("subscribe_email", email);
      target.searchParams.set("subscribed_pub", parsed.publication);
      return target.toString();
    }
    default:
      return redirect;
  }
}
