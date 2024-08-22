"use server";

import { getCurrentDeploymentDomain } from "src/utils/getCurrentDeploymentDomain";
import { createServerClient } from "@supabase/ssr";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { email_subscriptions_to_entity, entities } from "drizzle/schema";
import postgres from "postgres";
import { PermissionToken } from "src/replicache";
import { Database } from "supabase/database.types";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function sendPostToSubscribers({
  title,
  permission_token,
  mailboxEntity,
  messageEntity,
  contents,
}: {
  title: string;
  permission_token: PermissionToken;
  mailboxEntity: string;
  messageEntity: string;
  contents: {
    html: string;
    markdown: string;
  };
}) {
  let token_rights = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*)")
    .eq("id", permission_token.id)
    .single();
  let rootEntity = token_rights.data?.root_entity;
  if (!rootEntity || !token_rights.data) return { title: "Doc not found" };
  let { data } = await supabase.rpc("get_facts", {
    root: rootEntity,
  });

  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let subscribers = await db
    .select()
    .from(email_subscriptions_to_entity)
    .innerJoin(entities, eq(email_subscriptions_to_entity.entity, entities.id))
    .where(eq(email_subscriptions_to_entity.entity, mailboxEntity));
  let entity_set = subscribers[0]?.entities.set;
  if (
    !token_rights.data.permission_token_rights.find(
      (r) => r.entity_set === entity_set,
    )
  ) {
    return;
  }
  let domain = getCurrentDeploymentDomain();
  let res = await fetch("https://api.postmarkapp.com/email/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify(
      subscribers.map((sub) => ({
        Headers: [
          {
            Name: "List-Unsubscribe-Post",
            Value: "List-Unsubscribe=One-Click",
          },
          {
            Name: "List-Unsubscribe",
            Value: `<${domain}/mail/unsubscribe?sub_id=${sub.email_subscriptions_to_entity.id}>`,
          },
        ],
        MessageStream: "broadcast",
        From: "mailbox@leaflet.pub",
        Subject: `New Mail in : ${title}`,
        To: sub.email_subscriptions_to_entity.email,
        HtmlBody: `${contents.html}
        <a href="${domain}/${sub.email_subscriptions_to_entity.token}?sub_id=${sub.email_subscriptions_to_entity.id}&email=${sub.email_subscriptions_to_entity.email}&entity=${sub.email_subscriptions_to_entity.entity}&openCard=${messageEntity}">
        Click here to unsubscribe
        </a>
        `,
        TextBody: contents.markdown,
      })),
    ),
  });
  client.end();
  return;
}