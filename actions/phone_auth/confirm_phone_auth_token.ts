"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import { phone_number_auth_tokens } from "drizzle/schema";
import { cookies } from "next/headers";

export async function confirmPhoneAuthToken(tokenId: string, code: string) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  const [token] = await db
    .select()
    .from(phone_number_auth_tokens)
    .where(eq(phone_number_auth_tokens.id, tokenId));

  if (!token) {
    client.end();
    throw new Error("Invalid token");
  }

  if (token.confirmation_code !== code) {
    client.end();
    throw new Error("Invalid confirmation code");
  }

  if (token.confirmed) {
    client.end();
    throw new Error("Token already confirmed");
  }

  const [confirmedToken] = await db
    .update(phone_number_auth_tokens)
    .set({
      confirmed: true,
    })
    .where(
      and(
        eq(phone_number_auth_tokens.id, tokenId),
        eq(phone_number_auth_tokens.confirmation_code, code),
      ),
    )
    .returning();

  cookies().set("phone_auth_token", confirmedToken.id, {
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
  });

  client.end();
  return confirmedToken;
}
