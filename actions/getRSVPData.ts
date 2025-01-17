"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import {
  entities,
  phone_number_auth_tokens,
  phone_rsvps_to_entity,
} from "drizzle/schema";
import { cookies } from "next/headers";

export async function getRSVPData(entity_sets: string[]) {
  const token = cookies().get("phone_auth_token");

  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  let authToken: {
    id: string;
    created_at: string;
    confirmed: boolean;
    confirmation_code: string;
    phone_number: string;
    country_code: string;
  } | null = null;
  if (token) {
    const data = await db
      .select()
      .from(phone_number_auth_tokens)
      .where(eq(phone_number_auth_tokens.id, token.value));
    authToken = data[0];
  }

  const rsvps = await db
    .select()
    .from(phone_rsvps_to_entity)
    .innerJoin(entities, eq(entities.id, phone_rsvps_to_entity.entity))
    .where(and(inArray(entities.set, entity_sets)));

  client.end();
  return {
    authToken,
    rsvps: rsvps.map((rsvp) => {
      if (
        rsvp.phone_rsvps_to_entity.phone_number === authToken?.phone_number &&
        rsvp.phone_rsvps_to_entity.country_code === authToken.country_code
      )
        return {
          phone_number: rsvp.phone_rsvps_to_entity.phone_number,
          country_code: rsvp.phone_rsvps_to_entity.country_code,
          name: rsvp.phone_rsvps_to_entity.name,
          entity: rsvp.entities.id,
          status: rsvp.phone_rsvps_to_entity.status,
          plus_ones: rsvp.phone_rsvps_to_entity.plus_ones,
        };
      else
        return {
          name: rsvp.phone_rsvps_to_entity.name,
          entity: rsvp.entities.id,
          status: rsvp.phone_rsvps_to_entity.status,
          plus_ones: rsvp.phone_rsvps_to_entity.plus_ones,
        };
    }),
  };
}
