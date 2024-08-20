"use server";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  email_subscriptions_to_entity,
  pending_email_subscriptions_to_entity,
} from "drizzle/schema";
import postgres from "postgres";
import { PermissionToken } from "src/replicache";

export async function confirmEmailSubscription(
  subscriptionID: string,
  code: string,
  token: PermissionToken,
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let subscription = await db.transaction(async (tx) => {
    let [pending_subscription] = await db
      .select({
        email: pending_email_subscriptions_to_entity.email,
        id: pending_email_subscriptions_to_entity.id,
        entity: pending_email_subscriptions_to_entity.entity,
        code: pending_email_subscriptions_to_entity.code,
      })
      .from(pending_email_subscriptions_to_entity)
      .where(and(eq(pending_email_subscriptions_to_entity.id, subscriptionID)));
    if (code !== pending_subscription.code) return null;
    await db
      .delete(pending_email_subscriptions_to_entity)
      .where(eq(pending_email_subscriptions_to_entity.id, subscriptionID));
    let [existing_subscription] = await db
      .select()
      .from(email_subscriptions_to_entity)
      .where(
        and(
          eq(email_subscriptions_to_entity.entity, pending_subscription.entity),
          eq(email_subscriptions_to_entity.email, pending_subscription.email),
        ),
      );
    if (existing_subscription) return existing_subscription;
    let [subscription] = await db
      .insert(email_subscriptions_to_entity)
      .values({
        token: token.id,
        entity: pending_subscription.entity,
        email: pending_subscription.email,
      })
      .returning();

    return subscription;
  });
  client.end();
  return subscription;
}
