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

// Upserts the subscriber row for (publication, email) and logs the pair of
// events every subscription attempt produces: how the subscriber entered — an
// address that previously unsubscribed re-enters as a resubscribe rather than a
// fresh request — and what just happened to them. Shared by the code
// round-trip's `pending` row and the confirmed row every other path writes.
export async function upsertSubscriber(args: {
  publicationUri: string;
  email: string;
  identityId: string | null;
  state: "pending" | "confirmed";
  confirmationCode: string | null;
  event: "confirmation_sent" | "confirmed";
}): Promise<Result<{ id: string }, "database_error">> {
  const { data: existing } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("state")
    .eq("publication", args.publicationUri)
    .eq("email", args.email)
    .maybeSingle();
  const entryEvent =
    existing?.state === "unsubscribed" ? "resubscribed" : "subscribe_requested";

  const { data: subscriber, error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .upsert(
      {
        publication: args.publicationUri,
        email: args.email,
        identity_id: args.identityId,
        state: args.state,
        confirmation_code: args.confirmationCode,
        unsubscribed_at: null,
        ...(args.state === "confirmed"
          ? { confirmed_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: "publication,email" },
    )
    .select("id")
    .single();
  if (error || !subscriber) {
    console.error("[upsertSubscriber] upsert failed:", error);
    return Err("database_error");
  }

  const { error: eventsError } = await supabaseServerClient
    .from("publication_email_subscriber_events")
    .insert(
      [entryEvent, args.event].map((event_type) => ({
        subscriber: subscriber.id,
        publication: args.publicationUri,
        event_type,
      })),
    );
  if (eventsError) {
    console.error("[upsertSubscriber] events failed:", eventsError);
    return Err("database_error");
  }
  return Ok(subscriber);
}

export async function recordEmailSubscription(
  publicationUri: string,
  email: string,
  identityId: string,
  source?: SubscriptionSource | null,
): Promise<Result<null, "database_error">> {
  const upserted = await upsertSubscriber({
    publicationUri,
    email,
    identityId,
    state: "confirmed",
    confirmationCode: null,
    event: "confirmed",
  });
  if (!upserted.ok) return upserted;

  await onEmailSubscriptionConfirmed(publicationUri, email, identityId, source);
  return Ok(null);
}

// The tail every path that lands a subscriber row on `confirmed` shares: the
// analytics event, and the PDS record for a linked atproto account. That
// record mirrors the same subscription rather than adding a second one, so
// only the email event is tracked.
export async function onEmailSubscriptionConfirmed(
  publicationUri: string,
  email: string,
  identityId: string,
  source?: SubscriptionSource | null,
): Promise<void> {
  const { data: confirmedIdentity } = await supabaseServerClient
    .from("identities")
    .select("atp_did")
    .eq("id", identityId)
    .maybeSingle();
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
  if (confirmedIdentity?.atp_did)
    await publishAtprotoSubscriptionForDid(
      confirmedIdentity.atp_did,
      publicationUri,
    );
}

// Flips every still-active subscriber row for this publication to
// `unsubscribed` and logs the events. This is both "turn off email
// notifications" and the email half of a full unsubscribe: with the atproto
// record carrying "subscribed" for linked accounts, an email row's only job is
// delivery, so muting and unsubscribing the email channel are the same state.
// Re-enabling goes back through recordEmailSubscription (the resubscribe
// path), which restores `confirmed`.
//
// Rows come from the identity — which may own several historically (different
// emails tied to the same identity, e.g. a linked address that predates an
// email change), so one click stops all future mail — plus any `extraRows`
// resolved outside it, i.e. the row an unsubscribe token points at, which may
// have no identity at all.
export async function disableEmailSubscription(
  publicationUri: string,
  identity: {
    id?: string | null;
    atp_did?: string | null;
    email?: string | null;
  } | null,
  extraRows?: { id: string; state: string }[],
): Promise<Result<null, "database_error">> {
  const rows = [...(extraRows ?? [])];
  if (identity?.id) {
    const { data, error } = await supabaseServerClient
      .from("publication_email_subscribers")
      .select("id, state")
      .eq("publication", publicationUri)
      .eq("identity_id", identity.id);
    if (error) {
      console.error("[disableEmailSubscription] read failed:", error);
      return Err("database_error");
    }
    rows.push(...(data ?? []));
  }
  const rowIds = [
    ...new Set(rows.filter((r) => r.state !== "unsubscribed").map((r) => r.id)),
  ];
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
      "[disableEmailSubscription] update/event failed:",
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
      subscriberDid: identity?.atp_did,
      subscriberEmail: identity?.email,
    }),
  );
  return Ok(null);
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

export async function readdressIdentitySubscriptions(
  identityId: string,
  newEmail: string,
): Promise<void> {
  const email = newEmail.trim().toLowerCase();
  const { data: rows, error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, publication, email, state")
    .eq("identity_id", identityId);
  if (error) {
    console.error("[readdressIdentitySubscriptions] read failed:", error);
    return;
  }
  const atNewAddress = new Map(
    (rows ?? [])
      .filter((r) => r.email === email)
      .map((r) => [r.publication, r]),
  );
  const toMove: string[] = [];
  const toDelete: string[] = [];
  for (const row of rows ?? []) {
    if (row.email === email) continue;
    const existing = atNewAddress.get(row.publication);
    if (!existing) {
      toMove.push(row.id);
    } else if (row.state === "confirmed" && existing.state !== "confirmed") {
      toDelete.push(existing.id);
      toMove.push(row.id);
    } else {
      toDelete.push(row.id);
    }
  }
  if (toDelete.length) {
    const { error } = await supabaseServerClient
      .from("publication_email_subscribers")
      .delete()
      .in("id", toDelete);
    if (error) {
      console.error("[readdressIdentitySubscriptions] delete failed:", error);
      return;
    }
  }
  if (toMove.length) {
    const { error } = await supabaseServerClient
      .from("publication_email_subscribers")
      .update({ email })
      .in("id", toMove);
    if (error)
      console.error("[readdressIdentitySubscriptions] update failed:", error);
  }
}
