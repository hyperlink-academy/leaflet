"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import { permission_token_on_homepage } from "drizzle/schema";
import postgres from "postgres";
import { v7 } from "uuid";
import { sql, eq, inArray, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { getIdentityData } from "./getIdentityData";

export async function removeLeafletFromHome(tokens: string[]) {
  const identity = await getIdentityData();
  if (!identity) return null;

  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  await db
    .delete(permission_token_on_homepage)
    .where(
      and(
        eq(permission_token_on_homepage.identity, identity.id),
        inArray(permission_token_on_homepage.token, tokens),
      ),
    );

  client.end();
  return true;
}
