"use server";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { pending_email_subscriptions_to_entity } from "drizzle/schema";
import postgres from "postgres";

const generateCode = () => {
  // Generate a random 6 digit code
  let digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const randomDigit = () => digits[Math.floor(Math.random() * digits.length)];
  return [
    randomDigit(),
    randomDigit(),
    randomDigit(),
    randomDigit(),
    randomDigit(),
    randomDigit(),
  ].join("");
};

export async function subscribeToMailboxWithEmail(
  entity: string,
  email: string,
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let newCode = generateCode();
  let subscription = await db.transaction(async (tx) => {
    let existingEmail = await db
      .select({
        id: pending_email_subscriptions_to_entity.id,
        code: pending_email_subscriptions_to_entity.code,
      })
      .from(pending_email_subscriptions_to_entity)
      .where(
        and(
          eq(pending_email_subscriptions_to_entity.entity, entity),
          eq(pending_email_subscriptions_to_entity.email, email),
        ),
      );
    if (existingEmail[0]) return existingEmail[0];
    if (existingEmail.length === 0) {
      let newSubscription = await tx
        .insert(pending_email_subscriptions_to_entity)
        .values({
          entity,
          email,
          code: newCode,
        })
        .returning();
      return newSubscription[0];
    }
  });
  if (!subscription) return;
  let res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify({
      From: "subscriptions@leaflet.pub",
      Subject: `Your confirmation code is ${subscription.code}`,
      To: email,
      TextBody: `${subscription.code}`,
    }),
  });
  client.end();
  return subscription;
}
