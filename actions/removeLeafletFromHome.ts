"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { permission_token_on_homepage } from "drizzle/schema";
import postgres from "postgres";
import { v7 } from "uuid";
import { sql, eq, inArray, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { getIdentityData } from "./getIdentityData";
import { pool } from "supabase/pool";

export async function removeLeafletFromHome(tokens: string[]) {
  const identity = await getIdentityData();
  if (!identity) return null;

  const client = await pool.connect();
  const db = drizzle(client);

  await db
    .delete(permission_token_on_homepage)
    .where(
      and(
        eq(permission_token_on_homepage.identity, identity.id),
        inArray(permission_token_on_homepage.token, tokens),
      ),
    );

  client.release();
  return true;
}
