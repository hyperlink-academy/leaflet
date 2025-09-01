"use server";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import {
  entities,
  permission_token_rights,
  phone_rsvps_to_entity,
} from "drizzle/schema";
import twilio from "twilio";
import { pool } from "supabase/pool";

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
  let dbclient = await pool.connect();
  const db = drizzle(dbclient);
  let token_rights = await db
    .select()
    .from(permission_token_rights)
    .where(eq(permission_token_rights.token, token.id));

  let RSVPS = db
    .select()
    .from(phone_rsvps_to_entity)
    .innerJoin(entities, eq(phone_rsvps_to_entity.entity, entities.id))
    .where(eq(phone_rsvps_to_entity.entity, entity));

  dbclient.release();

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
