"use server";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  email_subscriptions_to_entity,
  pending_email_subscriptions_to_entity,
} from "drizzle/schema";
import postgres from "postgres";

export async function confirmEmailSubscription(
  subscriptionID: string,
  code: string,
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let subscription = await db.transaction(async (tx) => {
    let [subscription] = await db
      .select({
        email: pending_email_subscriptions_to_entity.email,
        id: pending_email_subscriptions_to_entity.id,
        entity: pending_email_subscriptions_to_entity.entity,
        code: pending_email_subscriptions_to_entity.code,
      })
      .from(pending_email_subscriptions_to_entity)
      .where(and(eq(pending_email_subscriptions_to_entity.id, subscriptionID)));
    if (code !== subscription.code) return false;
    await db.insert(email_subscriptions_to_entity).values({
      entity: subscription.entity,
      email: subscription.email,
    });

    return true;
  });
  client.end();
  return;
}
