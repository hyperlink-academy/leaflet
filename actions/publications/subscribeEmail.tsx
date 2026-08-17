"use server";

import { getAuthIdentity } from "src/auth";
import { mergeEmailIdentityIntoAtpIdentity } from "src/mergeIdentity";
import { supabaseServerClient } from "supabase/serverClient";
import {
  recordEmailSubscription,
  checkEmailSubscriptionAllowed,
  disableEmailSubscription,
  upsertSubscriber,
  onEmailSubscriptionConfirmed,
} from "src/subscriptions/email";
import { PubConfirmEmail } from "emails/pubConfirmEmail";
import { Ok, Err, type Result } from "src/result";
import {
  EMAIL_REGEX,
  generateConfirmationCode,
  matchesConfirmationCode,
  sendConfirmationEmail,
  type ConfirmationError,
} from "src/utils/confirmationEmail";
import { backfillAtprotoSubscriptionsForIdentity } from "src/subscriptions/atproto";
import {
  fullUnsubscribe,
  type FullUnsubscribeError,
} from "src/subscriptions/unsubscribe";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { linkOrphanedEmailSubscribers } from "src/utils/linkOrphanedEmailSubscribers";
import { blobRefToSrc, EMAIL_ICON_TRANSFORM } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/api";
import {
  sanitizeSubscriptionSource,
  type SubscriptionSource,
} from "src/subscriptionSource";

type RequestError =
  | "invalid_email"
  | "newsletter_disabled"
  | "suppressed_spam_complaint"
  | "suppression_delete_failed"
  | ConfirmationError;
type RequestSuccess = { confirmed: boolean };
type ConfirmError =
  | "subscriber_not_found"
  | "link_invalid_state"
  | "email_belongs_to_other_account"
  | ConfirmationError;
type UnsubscribeError = "unauthorized" | FullUnsubscribeError;

export async function requestPublicationEmailSubscription(
  publicationUri: string,
  emailRaw: string,
  source?: SubscriptionSource,
): Promise<Result<RequestSuccess, RequestError>> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return Err("invalid_email");

  const [allowed, { data: publication }, identity] = await Promise.all([
    checkEmailSubscriptionAllowed(publicationUri, email),
    supabaseServerClient
      .from("publications")
      .select("record")
      .eq("uri", publicationUri)
      .maybeSingle(),
    getAuthIdentity(),
  ]);
  if (!allowed.ok) return Err(allowed.error);
  const normalizedPub = normalizePublicationRecord(publication?.record);
  const pubName = normalizedPub?.name;
  const pubUrl = normalizedPub?.url;
  const assetsBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";
  const pubIcon = normalizedPub?.icon
    ? blobRefToSrc(
        normalizedPub.icon.ref,
        new AtUri(publicationUri).host,
        assetsBaseUrl,
        EMAIL_ICON_TRANSFORM,
      )
    : undefined;

  // Fast path: already authenticated with this email — skip the code round-trip.
  if (identity && identity.email?.toLowerCase() === email) {
    const res = await recordEmailSubscription(
      publicationUri,
      email,
      identity.id,
      sanitizeSubscriptionSource(source),
    );
    if (!res.ok) return Err(res.error);
    return Ok({ confirmed: true });
  }

  const pendingCode = generateConfirmationCode();
  const upserted = await upsertSubscriber({
    publicationUri,
    email,
    identityId: identity?.id ?? null,
    state: "pending",
    confirmationCode: pendingCode,
    event: "confirmation_sent",
  });
  if (!upserted.ok) return Err(upserted.error);

  const sent = await sendConfirmationEmail({
    to: email,
    subject: `Your subscription code is ${pendingCode}`,
    template: (
      <PubConfirmEmail
        code={pendingCode}
        publicationName={pubName}
        publicationUrl={pubUrl}
        publicationIcon={pubIcon}
        assetsBaseUrl={assetsBaseUrl}
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
  linkToCurrent: boolean = false,
  source?: SubscriptionSource,
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

  let identityId: string | null;
  if (linkToCurrent) {
    const linkResult = await linkEmailToCurrentIdentity(email);
    if (!linkResult.ok) return linkResult;
    identityId = linkResult.value;
  } else {
    const current = await getAuthIdentity();
    if (!current) return Err("subscriber_not_found");
    identityId = current.id;
  }

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

  await onEmailSubscriptionConfirmed(
    publicationUri,
    email,
    identityId,
    sanitizeSubscriptionSource(source),
  );
  return Ok(null);
}

// A viewer is "subscribed" if they have an email subscription, an atproto
// subscription, or a membership (see useViewerSubscription). Unsubscribe
// clears all of them — except an active paid membership, which the reader must
// cancel first (or, when it's already set to cancel at period end, confirm
// forfeiting the remaining time via `cancelPaidImmediately`).
export async function unsubscribeFromPublication(
  publicationUri: string,
  opts?: { cancelPaidImmediately?: boolean },
): Promise<Result<null, UnsubscribeError>> {
  const identity = await getAuthIdentity();
  if (!identity?.id) return Err("unauthorized");

  return fullUnsubscribe({
    publication: publicationUri,
    identity,
    cancelPaidImmediately: opts?.cancelPaidImmediately,
    allowStripeCancel: true,
  });
}

// The email-notifications toggle in the manage-subscription panel. Turning
// email off only mutes delivery (the atproto record and any membership keep
// the subscription alive); turning it on runs the resubscribe path with the
// identity's own email.
export async function setEmailNotifications(
  publicationUri: string,
  enabled: boolean,
): Promise<
  Result<
    null,
    | "unauthorized"
    | "no_email"
    | "database_error"
    | "newsletter_disabled"
    | "suppressed_spam_complaint"
    | "suppression_delete_failed"
  >
> {
  const identity = await getAuthIdentity();
  if (!identity?.id) return Err("unauthorized");

  if (!enabled) return disableEmailSubscription(publicationUri, identity);

  const email = identity.email?.toLowerCase();
  if (!email) return Err("no_email");
  const allowed = await checkEmailSubscriptionAllowed(publicationUri, email);
  if (!allowed.ok) return Err(allowed.error);
  return recordEmailSubscription(publicationUri, email, identity.id);
}

// Confirms an email subscription where the user has already chosen to link
// the email to their currently signed-in atp-only identity (via the
// LinkIdentityModal in the subscribe flow). Either attaches `email` to the
// current identity, or — if another email-only identity already owns it —
// merges that identity into the current one.
async function linkEmailToCurrentIdentity(
  email: string,
): Promise<Result<string, ConfirmError>> {
  const [current, { data: existing }] = await Promise.all([
    getAuthIdentity(),
    supabaseServerClient
      .from("identities")
      .select("id, atp_did")
      .eq("email", email)
      .maybeSingle(),
  ]);
  if (!current || !current.atp_did) return Err("link_invalid_state");

  // Already linked — confirmation is a no-op for the identity row itself.
  if (current.email && current.email.toLowerCase() === email)
    return Ok(current.id);

  // Current identity already has a *different* email. Linking would clobber
  // it, which the modal didn't promise — refuse.
  if (current.email) return Err("link_invalid_state");

  if (!existing || existing.id === current.id) {
    const { error } = await supabaseServerClient
      .from("identities")
      .update({ email })
      .eq("id", current.id);
    if (error) {
      console.error("[subscribeEmail] attach email failed:", error);
      return Err("database_error");
    }
    await linkOrphanedEmailSubscribers(current.id, email);
    await backfillAtprotoSubscriptionsForIdentity(current.id, current.atp_did);
    return Ok(current.id);
  }

  // Existing identity owns this email and isn't us. We can only merge if it's
  // an unlinked email-only account; otherwise it has its own atp_did and
  // merging would silently drop one of the two Bluesky links.
  if (existing.atp_did) return Err("email_belongs_to_other_account");

  const merged = await mergeEmailIdentityIntoAtpIdentity({
    sourceId: existing.id,
    targetId: current.id,
  });
  if (!merged.ok) return Err("database_error");
  return Ok(current.id);
}
