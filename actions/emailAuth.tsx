"use server";

import { randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";

import { email_auth_tokens, identities } from "drizzle/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { getAuthIdentity, setAuthToken } from "src/auth";
import { Err, Ok, type Result } from "src/result";
import { mergeEmailIdentityIntoAtpIdentity } from "src/mergeIdentity";
import { backfillAtprotoSubscriptionsForIdentity } from "src/subscriptions/atproto";
import { readdressIdentitySubscriptions } from "src/subscriptions/email";
import { updateStripeCustomerEmails } from "stripe/wallet";
import { postAuthRedirect } from "src/postAuthRedirect";
import { applyAfterSignInAction } from "src/subscriptions/email";
import { pool } from "supabase/pool";
import { supabaseServerClient } from "supabase/serverClient";
import { LeafletConfirmEmail } from "emails/leafletConfirmEmail";
import { PubConfirmEmail } from "emails/pubConfirmEmail";
import {
  EMAIL_REGEX,
  matchesConfirmationCode,
  sendConfirmationEmail,
} from "src/utils/confirmationEmail";
import { linkOrphanedEmailSubscribers } from "src/utils/linkOrphanedEmailSubscribers";

// When the email-login flow is entered as part of subscribing to a publication
// (the embedded subscribe form and the in-app subscribe button both route
// through it), the confirmation code is sent with a subscription-specific email
// instead of the generic "sign in" one.
export type AuthEmailSubscription = {
  publicationName?: string;
  publicationUrl?: string;
  publicationIcon?: string;
};

async function sendAuthCode(email: string, code: string) {
  await sendConfirmationEmail({
    to: email,
    subject: `Your authentication code for Leaflet is ${code}`,
    template: (
      <LeafletConfirmEmail
        code={code}
        title="Sign in to Leaflet"
        message="Paste this code to sign in"
        assetsBaseUrl={process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"}
      />
    ),
    text: `Paste this code to login to Leaflet:\n\n${code}\n`,
    devLogTag: "auth code",
    code,
  });
}

async function sendSubscriptionAuthCode(
  email: string,
  code: string,
  subscription: AuthEmailSubscription,
) {
  await sendConfirmationEmail({
    to: email,
    subject: `Your subscription code is ${code}`,
    template: (
      <PubConfirmEmail
        code={code}
        publicationName={subscription.publicationName}
        publicationUrl={subscription.publicationUrl}
        publicationIcon={subscription.publicationIcon}
        assetsBaseUrl={process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"}
      />
    ),
    text: `Paste this code to confirm your subscription:\n\n${code}\n`,
    devLogTag: "subscriber",
    code,
  });
}

// Throttle window for sending auth codes to a given email. Exposed via an
// unauthenticated GET endpoint (see app/api/auth/email-login), so without this a
// crafted link could spam a victim's inbox. Within the window we hand back the
// existing unconfirmed token instead of minting a new one and sending again —
// the code from the first email still works.
const AUTH_CODE_THROTTLE_MS = 60 * 1000;

export async function requestAuthEmailToken(
  emailNonNormalized: string,
  subscription?: AuthEmailSubscription,
) {
  return mintAuthEmailToken(emailNonNormalized, (email, code) =>
    subscription
      ? sendSubscriptionAuthCode(email, code, subscription)
      : sendAuthCode(email, code),
  );
}

async function mintAuthEmailToken(
  emailNonNormalized: string,
  send: (email: string, code: string) => Promise<void>,
) {
  let email = emailNonNormalized.toLowerCase();
  const client = await pool.connect();
  const db = drizzle(client);

  try {
    let cutoff = new Date(Date.now() - AUTH_CODE_THROTTLE_MS).toISOString();
    const [recent] = await db
      .select({ id: email_auth_tokens.id })
      .from(email_auth_tokens)
      .where(
        and(
          eq(email_auth_tokens.email, email),
          eq(email_auth_tokens.confirmed, false),
          gt(email_auth_tokens.created_at, cutoff),
        ),
      )
      .orderBy(desc(email_auth_tokens.created_at))
      .limit(1);
    if (recent) return recent.id;

    const code = randomBytes(3).toString("hex").toUpperCase();

    const [token] = await db
      .insert(email_auth_tokens)
      .values({
        email,
        confirmation_code: code,
        confirmed: false,
      })
      .returning({
        id: email_auth_tokens.id,
      });

    await send(email, code);

    return token.id;
  } finally {
    client.release();
  }
}

export async function confirmEmailAuthToken(tokenId: string, code: string) {
  const client = await pool.connect();
  const db = drizzle(client);

  const [token] = await db
    .select()
    .from(email_auth_tokens)
    .where(eq(email_auth_tokens.id, tokenId));

  if (!token || !token.email) {
    client.release();
    return null;
  }

  if (token.confirmation_code !== code) {
    client.release();
    return null;
  }

  if (token.confirmed) {
    client.release();
    return null;
  }

  let identityID;
  let [identity] = await db
    .select()
    .from(identities)
    .where(eq(identities.email, token.email));
  if (!identity) {
    const { data: newIdentity } = await supabaseServerClient
      .from("identities")
      .insert({ email: token.email })
      .select()
      .single();
    identityID = newIdentity!.id;
  } else {
    identityID = identity.id;
  }

  await linkOrphanedEmailSubscribers(identityID, token.email);

  const [confirmedToken] = await db
    .update(email_auth_tokens)
    .set({
      confirmed: true,
      identity: identityID,
    })
    .where(
      and(
        eq(email_auth_tokens.id, tokenId),
        eq(email_auth_tokens.confirmation_code, code),
      ),
    )
    .returning();

  await setAuthToken(confirmedToken.id);

  client.release();
  return confirmedToken;
}

// Confirms a code and returns where to send the browser. The session is minted
// first-party on the main site; for a custom-domain target postAuthRedirect
// routes through its receive_auth_callback so the session lands there too.
export async function confirmEmailLogin(
  tokenId: string,
  code: string,
  redirect: string,
  action: string | null = null,
): Promise<{ ok: false } | { ok: true; url: string }> {
  let confirmed = await confirmEmailAuthToken(tokenId, code);
  if (!confirmed) return { ok: false };

  let finalRedirect = await applyAfterSignInAction(
    action,
    redirect,
    confirmed.email,
    confirmed.identity,
  );
  return { ok: true, url: await postAuthRedirect(finalRedirect, confirmed.id) };
}

async function sendEmailChangeCode(email: string, code: string) {
  await sendConfirmationEmail({
    to: email,
    subject: `Your Leaflet confirmation code is ${code}`,
    template: (
      <LeafletConfirmEmail
        code={code}
        title="Confirm your new email"
        message="Paste this code to set this address as the email for your Leaflet account"
        assetsBaseUrl={process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"}
      />
    ),
    text: `Paste this code to set this address as the email for your Leaflet account:\n\n${code}\n`,
    devLogTag: "email change",
    code,
  });
}

export type AccountEmailChangeError =
  | "unauthorized"
  | "invalid_email"
  | "same_email"
  | "invalid_code"
  | "email_belongs_to_other_account"
  | "database_error";

export async function requestAccountEmailChange(
  emailRaw: string,
): Promise<Result<{ tokenId: string }, AccountEmailChangeError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("unauthorized");
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return Err("invalid_email");
  if (identity.email?.toLowerCase() === email) return Err("same_email");
  const tokenId = await mintAuthEmailToken(email, sendEmailChangeCode);
  return Ok({ tokenId });
}

export async function confirmAccountEmailChange(
  tokenId: string,
  code: string,
): Promise<Result<{ email: string }, AccountEmailChangeError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("unauthorized");

  const { data: token } = await supabaseServerClient
    .from("email_auth_tokens")
    .select("id, email, confirmation_code, confirmed")
    .eq("id", tokenId)
    .maybeSingle();
  if (
    !token?.email ||
    token.confirmed ||
    !matchesConfirmationCode(token.confirmation_code, code)
  )
    return Err("invalid_code");
  const email = token.email;

  const { data: existing } = await supabaseServerClient
    .from("identities")
    .select("id, atp_did")
    .eq("email", email)
    .maybeSingle();

  if (existing && existing.id !== identity.id) {
    if (existing.atp_did || !identity.atp_did)
      return Err("email_belongs_to_other_account");
    const merged = await mergeEmailIdentityIntoAtpIdentity({
      sourceId: existing.id,
      targetId: identity.id,
    });
    if (!merged.ok) return Err("database_error");
  } else {
    const { error } = await supabaseServerClient
      .from("identities")
      .update({ email })
      .eq("id", identity.id);
    if (error) {
      console.error("[emailAuth] set account email failed:", error);
      return Err("database_error");
    }
    await linkOrphanedEmailSubscribers(identity.id, email);
    if (identity.atp_did)
      await backfillAtprotoSubscriptionsForIdentity(
        identity.id,
        identity.atp_did,
      );
  }

  await readdressIdentitySubscriptions(identity.id, email);
  await updateStripeCustomerEmails(identity.id, email);
  await supabaseServerClient
    .from("email_auth_tokens")
    .delete()
    .eq("id", tokenId);
  return Ok({ email });
}
