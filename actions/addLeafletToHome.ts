"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { pool } from "supabase/pool";

export async function addLeafletToHome(leaflet: string) {
  let auth_token = (await cookies()).get("auth_token")?.value;
  const client = await pool.connect();
  const db = drizzle(client);
  await db.transaction(async (tx) => {
    if (auth_token) {
      await tx.execute(sql`
        WITH auth_token AS (
          SELECT identities.id as identity_id
          FROM email_auth_tokens
          LEFT JOIN identities ON email_auth_tokens.identity = identities.id
          WHERE email_auth_tokens.id = ${auth_token}
          AND email_auth_tokens.confirmed = true
          AND identities.id IS NOT NULL
        )
        INSERT INTO permission_token_on_homepage (token, identity)
        SELECT ${leaflet}, identity_id
        FROM auth_token
      `);
    }

    return;
  });
  client.release();
  return;
}
