"use server";

import { randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { email_auth_tokens, identities } from "drizzle/schema";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { createIdentity } from "./createIdentity";

async function sendAuthCode(email: string, code: string) {
  if (process.env.NODE_ENV === "development") {
    console.log("Auth code:", code);
    return;
  }

  let res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify({
      From: "Leaflet <accounts@leaflet.pub>",
      Subject: `Your authentication code for Leaflet is ${code}`,
      To: email,
      TextBody: `Paste this code to login to Leaflet:

${code}
      `,
      HtmlBody: `
      <html>
        <body>
          <p>Paste this code to login to Leaflet: <strong>${code}</strong></p>
        </body>
      </html>
      `,
    }),
  });
}

export async function requestAuthEmailToken(emailNonNormalized: string) {
  let email = emailNonNormalized.toLowerCase();
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

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

  client.end();
  return token.id;
}

export async function confirmEmailAuthToken(tokenId: string, code: string) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  const [token] = await db
    .select()
    .from(email_auth_tokens)
    .where(eq(email_auth_tokens.id, tokenId));

  if (!token || !token.email) {
    console.log("no token?");
    client.end();
    return null;
  }

  if (token.confirmation_code !== code) {
    console.log("wrong code???");
    client.end();
    return null;
  }

  if (token.confirmed) {
    console.log("already confirmed?????");
    client.end();
    return null;
  }
  let authToken = cookies().get("auth_token");
  if (authToken) {
    let [existingToken] = await db
      .select()
      .from(email_auth_tokens)
      .rightJoin(identities, eq(identities.id, email_auth_tokens.identity))
      .where(eq(email_auth_tokens.id, authToken.value));

    if (existingToken) {
      if (existingToken.identities?.email) {
        console.log("wat");
      }
      await db
        .update(identities)
        .set({ email: token.email })
        .where(eq(identities.id, existingToken.identities.id));
      client.end();
      return existingToken;
    }
  }

  let identityID;
  let [identity] = await db
    .select()
    .from(identities)
    .where(eq(identities.email, token.email));
  if (!identity) {
    let newIdentity = await createIdentity(db, { email: token.email });
    identityID = newIdentity.id;
  } else {
    identityID = identity.id;
  }

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

  cookies().set("auth_token", confirmedToken.id, {
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  });

  client.end();
  return confirmedToken;
}
