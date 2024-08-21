"use server";

import { createClient } from "@supabase/supabase-js";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  email_subscriptions_to_entity,
  facts,
  pending_email_subscriptions_to_entity,
} from "drizzle/schema";
import postgres from "postgres";
import { Fact, PermissionToken } from "src/replicache";
import { serverMutationContext } from "src/replicache/serverMutationContext";
import { Database } from "supabase/database.types";
import { v7 } from "uuid";

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
    let [fact] = (await db
      .select()
      .from(facts)
      .where(
        and(
          eq(facts.entity, pending_subscription.entity),

          eq(facts.attribute, "mailbox/subscriber-count"),
        ),
      )) as Fact<"mailbox/subscriber-count">[];
    if (!fact) {
      await db.insert(facts).values({
        id: v7(),
        entity: pending_subscription.entity,
        data: sql`${{ type: "number", value: 1 }}::jsonb`,
        attribute: "mailbox/subscriber-count",
      });
    } else {
      await db
        .update(facts)
        .set({
          data: sql`${{ type: "number", value: fact.data.value + 1 }}::jsonb`,
        })
        .where(eq(facts.id, fact.id));
    }
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

  let supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
  let channel = supabase.channel(`rootEntity:${token.root_entity}`);
  await channel.send({
    type: "broadcast",
    event: "poke",
    payload: { message: "poke" },
  });
  supabase.removeChannel(channel);
  client.end();
  return subscription;
}
