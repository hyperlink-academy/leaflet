"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import {
  phone_number_auth_tokens,
  phone_rsvps_to_entity,
} from "drizzle/schema";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";
import { pool } from "supabase/pool";

export async function getPhoneRSVPToEventState(entityId: string) {
  const token = (await cookies()).get("phone_auth_token");

  if (!token) {
    return null;
  }

  const client = await pool.connect();
  const db = drizzle(client);

  const [authToken] = await db
    .select()
    .from(phone_number_auth_tokens)
    .where(eq(phone_number_auth_tokens.id, token.value));

  if (!authToken || !authToken.confirmed) {
    client.release();
    return null;
  }

  const [rsvp] = await db
    .select()
    .from(phone_rsvps_to_entity)
    .where(
      and(
        eq(phone_rsvps_to_entity.phone_number, authToken.phone_number),
        eq(phone_rsvps_to_entity.entity, entityId),
      ),
    );

  client.release();
  return rsvp;
}
