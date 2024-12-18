"use server";

import { randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { email_auth_tokens, identities } from "drizzle/schema";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";

async function sendAuthCode(email: string, code: string) {
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
    }),
  });
}

export async function requestAuthEmailToken(email: string) {
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

  if (!token) {
    client.end();
    return null;
  }

  if (token.confirmation_code !== code) {
    client.end();
    return null;
  }

  if (token.confirmed) {
    client.end();
    return null;
  }

  let [identity] = await db
    .select()
    .from(identities)
    .where(eq(identities.email, token.email));

  const [confirmedToken] = await db
    .update(email_auth_tokens)
    .set({
      confirmed: true,
      identity: identity?.id,
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
    sameSite: "strict",
  });

  client.end();
  return confirmedToken;
}
