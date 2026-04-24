"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { setAuthToken } from "src/auth";
import { PubConfirmEmail } from "emails/pubConfirmEmail";
import { Ok, Err, type Result } from "src/result";
import {
  EMAIL_REGEX,
  generateConfirmationCode,
  matchesConfirmationCode,
  sendConfirmationEmail,
  type ConfirmationError,
} from "src/utils/confirmationEmail";
import {
  getSuppression,
  deleteSuppression,
} from "src/utils/postmarkSuppressions";
import {
  publishAtprotoSubscriptionForDid,
  unsubscribeToPublication,
} from "app/lish/subscribeToPublication";

type RequestError =
  | "invalid_email"
  | "newsletter_disabled"
  | "suppressed_spam_complaint"
  | "suppression_delete_failed"
  | ConfirmationError;
type RequestSuccess = { confirmed: boolean };
type ConfirmError = "subscriber_not_found" | ConfirmationError;
type UnsubscribeError = "unauthorized" | "not_subscribed" | "database_error";

export async function requestPublicationEmailSubscription(
  publicationUri: string,
  emailRaw: string,
): Promise<Result<RequestSuccess, RequestError>> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return Err("invalid_email");

  const [{ data: settings }, identity] = await Promise.all([
    supabaseServerClient
      .from("publication_newsletter_settings")
      .select("enabled")
      .eq("publication", publicationUri)
      .maybeSingle(),
    getIdentityData(),
  ]);
  if (!settings?.enabled) return Err("newsletter_disabled");

  // Postmark suppression check: the broadcast stream is shared across all
  // pubs, so a prior SpamComplaint or HardBounce on ANY publication blocks
  // this one too. Spam complaints are permanent on Postmark's side (they
  // refuse deletion) — surface a terminal error. Hard bounces / manual
  // suppressions we clear now so the upcoming broadcast will deliver.
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

  // Fast path: the caller is already authenticated with this email (they
  // previously confirmed it on this or another publication), so we can skip
  // the confirmation code round-trip.
  const verifiedIdentity =
    identity && identity.email?.toLowerCase() === email ? identity : null;
  const pendingCode = generateConfirmationCode();

  // Check the existing row first — a previous `unsubscribed` row means the
  // first event we append is `resubscribed` rather than `subscribe_requested`.
  const { data: existing } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("state")
    .eq("publication", publicationUri)
    .eq("email", email)
    .maybeSingle();
  const wasUnsubscribed = existing?.state === "unsubscribed";

  const subscriberRow = verifiedIdentity
    ? {
        publication: publicationUri,
        email,
        identity_id: verifiedIdentity.id,
        state: "confirmed",
        confirmation_code: null,
        confirmed_at: new Date().toISOString(),
        unsubscribed_at: null,
      }
    : {
        publication: publicationUri,
        email,
        identity_id: identity?.id ?? null,
        state: "pending",
        confirmation_code: pendingCode,
        unsubscribed_at: null,
      };

  const { data: subscriber, error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .upsert(subscriberRow, { onConflict: "publication,email" })
    .select("id")
    .single();
  if (error || !subscriber) {
    console.error("[subscribeEmail] upsert subscriber failed:", error);
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
        event_type: verifiedIdentity ? "confirmed" : "confirmation_sent",
      },
    ]);
  if (eventsError) {
    console.error("[subscribeEmail] insert events failed:", eventsError);
    return Err("database_error");
  }

  if (verifiedIdentity) {
    if (verifiedIdentity.atp_did) {
      await publishAtprotoSubscriptionForDid(
        verifiedIdentity.atp_did,
        publicationUri,
      );
    }
    return Ok({ confirmed: true });
  }

  const sent = await sendConfirmationEmail({
    to: email,
    subject: `Your subscription code is ${pendingCode}`,
    template: (
      <PubConfirmEmail
        code={pendingCode}
        assetsBaseUrl={process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"}
      />
    ),
    text: `Paste this code to confirm your subscription:\n\n${pendingCode}\n`,
    devLogTag: "subscriber",
    code: pendingCode,
  });
  if (!sent) return Err("email_send_failed");

  return Ok({ confirmed: false });
}

export async function confirmPublicationEmailSubscription(
  publicationUri: string,
  emailRaw: string,
  code: string,
): Promise<Result<null, ConfirmError>> {
  const email = emailRaw.trim().toLowerCase();

  const { data: subscriber } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, confirmation_code, state")
    .eq("publication", publicationUri)
    .eq("email", email)
    .maybeSingle();
  if (!subscriber || !subscriber.confirmation_code)
    return Err("subscriber_not_found");

  if (!matchesConfirmationCode(subscriber.confirmation_code, code))
    return Err("invalid_code");

  // The confirmation code proves ownership of `email`. Issue (or look up) an
  // auth token for it so the subscriber is logged in and can one-click
  // subscribe to other publications from the same device.
  const identityId = await ensureAuthTokenForEmail(email);
  if (!identityId) return Err("database_error");

  const [{ error: updateError }, { error: eventError }] = await Promise.all([
    supabaseServerClient
      .from("publication_email_subscribers")
      .update({
        state: "confirmed",
        confirmation_code: null,
        confirmed_at: new Date().toISOString(),
        identity_id: identityId,
      })
      .eq("id", subscriber.id),
    supabaseServerClient.from("publication_email_subscriber_events").insert({
      subscriber: subscriber.id,
      publication: publicationUri,
      event_type: "confirmed",
    }),
  ]);
  if (updateError || eventError) {
    console.error(
      "[subscribeEmail] confirm update/event failed:",
      updateError ?? eventError,
    );
    return Err("database_error");
  }

  const { data: confirmedIdentity } = await supabaseServerClient
    .from("identities")
    .select("atp_did")
    .eq("id", identityId)
    .maybeSingle();
  if (confirmedIdentity?.atp_did) {
    await publishAtprotoSubscriptionForDid(
      confirmedIdentity.atp_did,
      publicationUri,
    );
  }

  return Ok(null);
}

export async function unsubscribeFromPublication(
  publicationUri: string,
): Promise<Result<null, UnsubscribeError>> {
  const identity = await getIdentityData();
  if (!identity?.id) return Err("unauthorized");

  // A viewer is "subscribed" if they have EITHER an email subscription OR an
  // atproto subscription (see useViewerSubscription). Unsubscribe must clear
  // both — otherwise a user with only an atproto sub hits "not_subscribed"
  // and a user with both ends up half-unsubscribed.
  const [{ data: subscribers }, { data: atprotoSub }] = await Promise.all([
    supabaseServerClient
      .from("publication_email_subscribers")
      .select("id, state")
      .eq("publication", publicationUri)
      .eq("identity_id", identity.id),
    identity.atp_did
      ? supabaseServerClient
          .from("publication_subscriptions")
          .select("uri")
          .eq("identity", identity.atp_did)
          .eq("publication", publicationUri)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  // Identity may have multiple matching subscriber rows historically
  // (different emails tied to the same identity, e.g. a linked address that
  // predates an email change). Unsubscribe all of them at once — a single
  // "Unsubscribe" click from this user should stop all future newsletter
  // mail from this publication.
  const active = (subscribers ?? []).filter((s) => s.state !== "unsubscribed");

  if (active.length === 0 && !atprotoSub) {
    if (subscribers && subscribers.length > 0) return Ok(null); // already unsubscribed; idempotent
    return Err("not_subscribed");
  }

  if (active.length > 0) {
    const ids = active.map((s) => s.id);
    const nowIso = new Date().toISOString();
    const [{ error: updateError }, { error: eventError }] = await Promise.all([
      supabaseServerClient
        .from("publication_email_subscribers")
        .update({
          state: "unsubscribed",
          unsubscribed_at: nowIso,
          confirmation_code: null,
        })
        .in("id", ids),
      supabaseServerClient.from("publication_email_subscriber_events").insert(
        active.map((s) => ({
          subscriber: s.id,
          publication: publicationUri,
          event_type: "unsubscribe_requested",
        })),
      ),
    ]);
    if (updateError || eventError) {
      console.error(
        "[subscribeEmail] unsubscribe update/event failed:",
        updateError ?? eventError,
      );
      return Err("database_error");
    }
  }

  if (atprotoSub) {
    await unsubscribeToPublication(publicationUri);
  }

  // NOTE: Postmark Suppressions API is deliberately NOT called here. Per spec,
  // in-app unsubscribes only flip local state — this prevents a Pub A
  // unsubscribe from silently breaking Pub B deliveries on the shared broadcast
  // stream. Phase 7 handles webhook-driven suppression reconciliation.

  return Ok(null);
}

async function ensureAuthTokenForEmail(email: string): Promise<string | null> {
  const existingIdentity = await getIdentityData();
  if (existingIdentity) return existingIdentity.id;

  const { data: identity, error: identityError } = await supabaseServerClient
    .from("identities")
    .upsert({ email }, { onConflict: "email" })
    .select("id")
    .single();
  if (identityError || !identity) {
    console.error("[subscribeEmail] identity upsert failed:", identityError);
    return null;
  }

  const { data: token, error: tokenError } = await supabaseServerClient
    .from("email_auth_tokens")
    .insert({
      email,
      identity: identity.id,
      confirmed: true,
      // Required NOT NULL column; this token is already confirmed so the code
      // is never consulted, but we still give it a random value.
      confirmation_code: generateConfirmationCode(),
    })
    .select("id")
    .single();
  if (tokenError || !token) {
    console.error("[subscribeEmail] token insert failed:", tokenError);
    return null;
  }

  await setAuthToken(token.id);
  return identity.id;
}
