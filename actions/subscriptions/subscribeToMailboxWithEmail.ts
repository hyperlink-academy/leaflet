"use server";

import * as base64 from "base64-js";
import { createServerClient } from "@supabase/ssr";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { email_subscriptions_to_entity } from "drizzle/schema";
import postgres from "postgres";
import { getBlocksWithTypeLocal } from "src/replicache/getBlocks";
import type { Fact, PermissionToken } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { Database } from "supabase/database.types";
import * as Y from "yjs";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import { pool } from "supabase/pool";

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
  token: PermissionToken,
) {
  const client = await pool.connect();
  const db = drizzle(client);
  let newCode = generateCode();
  let subscription = await db.transaction(async (tx) => {
    let existingEmail = await db
      .select()
      .from(email_subscriptions_to_entity)
      .where(
        and(
          eq(email_subscriptions_to_entity.entity, entity),
          eq(email_subscriptions_to_entity.email, email),
        ),
      );
    if (existingEmail[0]) return existingEmail[0];
    if (existingEmail.length === 0) {
      let newSubscription = await tx
        .insert(email_subscriptions_to_entity)
        .values({
          token: token.id,
          entity,
          email,
          confirmation_code: newCode,
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
      Subject: `Your confirmation code is ${subscription.confirmation_code}`,
      To: email,
      TextBody: `Paste this code to confirm your subscription to a mailbox in ${await getPageTitle(token.root_entity)}:

${subscription.confirmation_code}
      `,
    }),
  });
  client.release();
  return subscription;
}

async function getPageTitle(root_entity: string) {
  let { data } = await supabase.rpc("get_facts", {
    root: root_entity,
  });
  let initialFacts = (data as unknown as Fact<Attribute>[]) || [];
  let firstPage = initialFacts.find((f) => f.attribute === "root/page") as
    | Fact<"root/page">
    | undefined;
  let root = firstPage?.data.value || root_entity;
  let blocks = getBlocksWithTypeLocal(initialFacts, root);
  let title = blocks.filter(
    (f) => f.type === "text" || f.type === "heading",
  )[0];
  let text = initialFacts.find(
    (f) => f.entity === title?.value && f.attribute === "block/text",
  ) as Fact<"block/text"> | undefined;
  if (!text) return "Untitled Leaflet";
  let doc = new Y.Doc();
  const update = base64.toByteArray(text.data.value);
  Y.applyUpdate(doc, update);
  let nodes = doc.getXmlElement("prosemirror").toArray();
  return YJSFragmentToString(nodes[0]) || "Untitled Leaflet";
}
