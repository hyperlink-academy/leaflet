"use server";

import { createClient } from "@supabase/supabase-js";
import { createIdentity } from "actions/createIdentity";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  email_subscriptions_to_entity,
  facts,
  permission_tokens,
} from "drizzle/schema";
import postgres from "postgres";
import { Fact, PermissionToken } from "src/replicache";
import { serverMutationContext } from "src/replicache/serverMutationContext";
import { Database } from "supabase/database.types";
import { v7 } from "uuid";

export async function confirmEmailSubscription(
  subscriptionID: string,
  code: string,
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let subscription = await db.transaction(async (tx) => {
    let [{ email_subscriptions_to_entity: sub, permission_tokens: token }] =
      await db
        .select()
        .from(email_subscriptions_to_entity)
        .innerJoin(
          permission_tokens,
          eq(permission_tokens.id, email_subscriptions_to_entity.token),
        )
        .where(and(eq(email_subscriptions_to_entity.id, subscriptionID)));
    if (sub.confirmed) return { subscription: sub, token };
    if (code !== sub.confirmation_code) return null;
    let [fact] = (await db
      .select()
      .from(facts)
      .where(
        and(
          eq(facts.entity, sub.entity),

          eq(facts.attribute, "mailbox/subscriber-count"),
        ),
      )) as Fact<"mailbox/subscriber-count">[];
    if (!fact) {
      await db.insert(facts).values({
        id: v7(),
        entity: sub.entity,
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
      .update(email_subscriptions_to_entity)
      .set({
        confirmed: true,
      })
      .where(eq(email_subscriptions_to_entity.id, sub.id))
      .returning();

    return { subscription, token };
  });

  let supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
  let channel = supabase.channel(
    `rootEntity:${subscription?.token.root_entity}`,
  );
  await channel.send({
    type: "broadcast",
    event: "poke",
    payload: { message: "poke" },
  });
  supabase.removeChannel(channel);
  client.end();
  return subscription;
}
