"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";

export async function getRSVPData(entity_sets: string[]) {
  const token = (await cookies()).get("phone_auth_token");

  let authToken: {
    id: string;
    created_at: string;
    confirmed: boolean;
    confirmation_code: string;
    phone_number: string;
    country_code: string;
  } | null = null;
  if (token) {
    let { data } = await supabaseServerClient
      .from("phone_number_auth_tokens")
      .select("*")
      .eq("id", token.value)
      .single();
    authToken = data;
  }

  const { data: rsvps } = await supabaseServerClient
    .from("phone_rsvps_to_entity")
    .select(
      `
      *,
      entities!inner(*)
    `,
    )
    .in("entities.set", entity_sets);

  return {
    authToken,
    rsvps:
      rsvps?.map((rsvp) => {
        if (
          rsvp.phone_number === authToken?.phone_number &&
          rsvp.country_code === authToken.country_code
        )
          return {
            phone_number: rsvp.phone_number,
            country_code: rsvp.country_code,
            name: rsvp.name,
            entity: rsvp.entities.id,
            status: rsvp.status,
            plus_ones: rsvp.plus_ones,
          };
        else
          return {
            name: rsvp.name,
            entity: rsvp.entities.id,
            status: rsvp.status,
            plus_ones: rsvp.plus_ones,
          };
      }) || [],
  };
}
