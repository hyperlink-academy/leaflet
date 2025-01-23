"use server";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import {
  entities,
  permission_token_rights,
  phone_rsvps_to_entity,
} from "drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import twilio from "twilio";

const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
const db = drizzle(client);

export async function sendUpdateToRSVPS(
  token: { id: string },
  {
    entity,
    message,
    eventName,
    sendto,
    publicLeafletID,
  }: {
    entity: string;
    message: string;
    eventName: string;
    publicLeafletID: string;
    sendto: { GOING: boolean; MAYBE: boolean; NOT_GOING: boolean };
  },
) {
  let token_rights = await db
    .select()
    .from(permission_token_rights)
    .where(eq(permission_token_rights.token, token.id));

  let RSVPS = db
    .select()
    .from(phone_rsvps_to_entity)
    .innerJoin(entities, eq(phone_rsvps_to_entity.entity, entities.id))
    .where(eq(phone_rsvps_to_entity.entity, entity));

  if (!token_rights[0]?.write) return;
  let rsvps = await RSVPS;
  let entity_set = rsvps[0]?.entities.set;
  if (!token_rights.find((r) => r.entity_set === entity_set)) {
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  for (let rsvp of rsvps) {
    if (sendto[rsvp.phone_rsvps_to_entity.status]) {
      let { country_code, phone_number } = rsvp.phone_rsvps_to_entity;
      let number = `+${country_code}${phone_number}`;
      await client.messages.create({
        contentSid: "HX8e1217f791d38fa4cf7b7b24a02fe10c",
        contentVariables: JSON.stringify({
          1: eventName,
          2: message,
          3: `https://leaflet.pub/${publicLeafletID}`,
        }),
        from: `${country_code === "1" ? "" : "whatsapp:"}+18449523391`,
        messagingServiceSid: "MGffbf9a66770350b25caf3b80b9aac481",
        to: country_code === "1" ? number : `whatsapp:${number}`,
      });
    }
  }
}
