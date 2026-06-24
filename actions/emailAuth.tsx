"use server";

import { randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";

import { email_auth_tokens, identities } from "drizzle/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { setAuthToken } from "src/auth";
import { postAuthRedirect } from "src/crossSiteAuth";
import { pool } from "supabase/pool";
import { supabaseServerClient } from "supabase/serverClient";
import { LeafletConfirmEmail } from "emails/leafletConfirmEmail";
import { sendConfirmationEmail } from "src/utils/confirmationEmail";
import { linkOrphanedEmailSubscribers } from "src/utils/linkOrphanedEmailSubscribers";

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

// Throttle window for sending auth codes to a given email. Exposed via an
// unauthenticated GET endpoint (see app/api/auth/email-login), so without this a
// crafted link could spam a victim's inbox. Within the window we hand back the
// existing unconfirmed token instead of minting a new one and sending again —
// the code from the first email still works.
const AUTH_CODE_THROTTLE_MS = 60 * 1000;

export async function requestAuthEmailToken(emailNonNormalized: string) {
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

    await sendAuthCode(email, code);

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
): Promise<{ ok: false } | { ok: true; url: string }> {
  let confirmed = await confirmEmailAuthToken(tokenId, code);
  if (!confirmed) return { ok: false };
  return { ok: true, url: await postAuthRedirect(redirect, confirmed.id) };
}
