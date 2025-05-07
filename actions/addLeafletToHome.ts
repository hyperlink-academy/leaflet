"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import {
  entities,
  identities,
  permission_tokens,
  permission_token_rights,
  entity_sets,
  facts,
  permission_token_on_homepage,
  email_auth_tokens,
} from "drizzle/schema";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { v7 } from "uuid";
import { sql, eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function addLeafletToHome(leaflet: string) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  let auth_token = (await cookies()).get("auth_token")?.value;
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

  client.end();
  return;
}
