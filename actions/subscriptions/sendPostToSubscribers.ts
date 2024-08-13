"use server";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  email_subscriptions_to_entity,
  pending_email_subscriptions_to_entity,
} from "drizzle/schema";
import postgres from "postgres";
import { PermissionToken } from "src/replicache";

export async function sendPostToSubscribers(
  permission_token: PermissionToken,
  entity: string,
  contents: {
    html: string;
    markdown: string;
  },
) {
  //TODO Implement permissioning lmao
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let subscribers = await db
    .select()
    .from(email_subscriptions_to_entity)
    .where(eq(email_subscriptions_to_entity.entity, entity));
  let res = await fetch("https://api.postmarkapp.com/email/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify(
      subscribers.map((sub) => ({
        MessageStream: "broadcast",
        From: "mailbox@leaflet.pub",
        Subject: `A new update in: ${entity}`,
        To: sub.email,
        HtmlBody: contents.html,
        TextBody: contents.markdown,
      })),
    ),
  });
  client.end();
  return;
}
