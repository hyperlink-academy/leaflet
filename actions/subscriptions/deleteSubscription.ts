"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { email_subscriptions_to_entity, facts } from "drizzle/schema";
import postgres from "postgres";
import { eq, and, sql } from "drizzle-orm";
import type { Fact } from "src/replicache";
import { v7 } from "uuid";
import { pool } from "supabase/pool";

export async function deleteSubscription(subscriptionID: string) {
  const client = await pool.connect();
  const db = drizzle(client);

  try {
    await db.transaction(async (db) => {
      let [subscription] = await db
        .select()
        .from(email_subscriptions_to_entity)
        .where(eq(email_subscriptions_to_entity.id, subscriptionID));
      if (!subscription) return;
      let [fact] = (await db
        .select()
        .from(facts)
        .where(
          and(
            eq(facts.entity, subscription.entity),

            eq(facts.attribute, "mailbox/subscriber-count"),
          ),
        )) as Fact<"mailbox/subscriber-count">[];
      if (fact) {
        await db
          .update(facts)
          .set({
            data: sql`${{ type: "number", value: fact.data.value - 1 }}::jsonb`,
          })
          .where(eq(facts.id, fact.id));
      }
      await db
        .delete(email_subscriptions_to_entity)
        .where(eq(email_subscriptions_to_entity.id, subscriptionID));
    });

    client.release();
    return { success: true };
  } catch (error) {
    console.error("Error unsubscribing:", error);
    client.release();
    return { success: false, error: "Failed to unsubscribe" };
  }
}
