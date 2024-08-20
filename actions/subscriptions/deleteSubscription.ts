"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import { email_subscriptions_to_entity } from "drizzle/schema";
import postgres from "postgres";
import { eq } from "drizzle-orm";

export async function deleteSubscription(subscriptionID: string) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  try {
    await db
      .delete(email_subscriptions_to_entity)
      .where(eq(email_subscriptions_to_entity.id, subscriptionID));

    client.end();
    return { success: true };
  } catch (error) {
    console.error("Error unsubscribing:", error);
    client.end();
    return { success: false, error: "Failed to unsubscribe" };
  }
}