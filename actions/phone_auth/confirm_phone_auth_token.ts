"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import { phone_number_auth_tokens } from "drizzle/schema";
import { cookies } from "next/headers";
import { pool } from "supabase/pool";

export async function confirmPhoneAuthToken(tokenId: string, code: string) {
  const client = await pool.connect();
  const db = drizzle(client);

  const [token] = await db
    .select()
    .from(phone_number_auth_tokens)
    .where(eq(phone_number_auth_tokens.id, tokenId));

  if (!token) {
    client.release();
    throw new Error("Invalid token");
  }

  if (token.confirmation_code !== code) {
    client.release();
    throw new Error("Invalid confirmation code");
  }

  if (token.confirmed) {
    client.release();
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

  (await cookies()).set("phone_auth_token", confirmedToken.id, {
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
  });

  client.release();
  return confirmedToken;
}
