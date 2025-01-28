import { createServerClient } from "@supabase/ssr";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  facts,
  permission_token_rights,
  permission_tokens,
} from "drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import type { MetadataRoute } from "next";
import postgres from "postgres";
import { Database } from "supabase/database.types";

export const revalidate = 3600;

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let tokens = await db
    .select()
    .from(facts)
    .innerJoin(
      permission_tokens,
      eq(permission_tokens.root_entity, facts.entity),
    )
    .innerJoin(
      permission_token_rights,
      eq(permission_tokens.id, permission_token_rights.token),
    )
    .where(
      and(
        eq(facts.attribute, "root/webindex"),
        eq(sql`(${facts.data} ->> 'value')::boolean`, true),
        eq(permission_token_rights.write, false),
      ),
    );
  client.end();

  return tokens.map((token) => ({
    url: "https://leaflet.pub/" + token.permission_tokens.id,
    changeFrequency: "hourly",
    priority: 1,
  }));
}
