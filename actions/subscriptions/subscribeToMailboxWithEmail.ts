"use server";

import * as base64 from "base64-js";
import { createServerClient } from "@supabase/ssr";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { pending_email_subscriptions_to_entity } from "drizzle/schema";
import postgres from "postgres";
import { getBlocksWithTypeLocal } from "src/hooks/queries/useBlocks";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { Database } from "supabase/database.types";
import * as Y from "yjs";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
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
  root_entity: string,
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
      From: "Leaflet Subscriptions <subscriptions@leaflet.pub>",
      Subject: `Your confirmation code is ${subscription.code}`,
      To: email,
      TextBody: `Paste this code to confirm your subscription to a mailbox in ${await getPageTitle(root_entity)}:

${subscription.code}
      `,
    }),
  });
  client.end();
  return subscription;
}

async function getPageTitle(root_entity: string) {
  let { data } = await supabase.rpc("get_facts", {
    root: root_entity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  let blocks = getBlocksWithTypeLocal(initialFacts, root_entity);
  let title = blocks.filter(
    (f) => f.type === "text" || f.type === "heading",
  )[0];
  let text = initialFacts.find(
    (f) => f.entity === title.value && f.attribute === "block/text",
  ) as Fact<"block/text"> | undefined;
  if (!text) return "Untitled Doc";
  let doc = new Y.Doc();
  const update = base64.toByteArray(text.data.value);
  Y.applyUpdate(doc, update);
  let nodes = doc.getXmlElement("prosemirror").toArray();
  return YJSFragmentToString(nodes[0]) || "Untitled Leaflet";
}
