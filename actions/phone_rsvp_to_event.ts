"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import {
  entities,
  phone_number_auth_tokens,
  phone_rsvps_to_entity,
} from "drizzle/schema";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { v7 } from "uuid";
import { eq, sql } from "drizzle-orm";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function submitRSVP(args: {
  entity: string;
  status: Database["public"]["Enums"]["rsvp_status"];
  name: string;
}) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let token = cookies().get("phone_auth_token");
  if (!token) throw new Error("No auth token found");

  let [auth_token] = await db
    .select()
    .from(phone_number_auth_tokens)
    .where(eq(phone_number_auth_tokens.id, token.value));
  if (!auth_token) throw new Error("Invalid auth token");
  if (!auth_token.confirmed) throw new Error("Auth token not confirmed");

  await db.transaction(async (tx) => {
    await tx
      .insert(phone_rsvps_to_entity)
      .values([
        {
          status: args.status,
          entity: args.entity,
          phone_number: auth_token.phone_number,
          country_code: auth_token.country_code,
          name: args.name,
        },
      ])
      .onConflictDoUpdate({
        target: [
          phone_rsvps_to_entity.entity,
          phone_rsvps_to_entity.phone_number,
        ],
        set: {
          name: args.name,
          status: args.status,
        },
      });
  });

  client.end();
  return { success: true };
}
