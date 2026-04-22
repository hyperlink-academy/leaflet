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

type RequestError = "invalid_email" | "newsletter_disabled" | ConfirmationError;
type RequestSuccess = { confirmed: boolean };
type ConfirmError = "subscriber_not_found" | ConfirmationError;

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

  // Fast path: the caller is already authenticated with this email (they
  // previously confirmed it on this or another publication), so we can skip
  // the confirmation code round-trip.
  const verifiedIdentity =
    identity && identity.email?.toLowerCase() === email ? identity : null;
  const pendingCode = generateConfirmationCode();

  const subscriberRow = verifiedIdentity
    ? {
        publication: publicationUri,
        email,
        identity_id: verifiedIdentity.id,
        state: "confirmed",
        confirmation_code: null,
        confirmed_at: new Date().toISOString(),
      }
    : {
        publication: publicationUri,
        email,
        identity_id: identity?.id ?? null,
        state: "pending",
        confirmation_code: pendingCode,
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
        event_type: "subscribe_requested",
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

  if (verifiedIdentity) return Ok({ confirmed: true });

  const sent = await sendConfirmationEmail({
    to: email,
    subject: `Your subscription code is ${pendingCode}`,
    template: <PubConfirmEmail code={pendingCode} />,
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
