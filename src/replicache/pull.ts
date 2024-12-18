"use server";

import { createClient } from "@supabase/supabase-js";
import {
  PullRequest,
  PullResponseV1,
  VersionNotSupportedResponse,
} from "replicache";
import { Database } from "supabase/database.types";
import { Fact } from ".";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { FactWithIndexes, getClientGroup } from "./utils";
import { Attributes } from "./attributes";
import { permission_tokens } from "drizzle/schema";
import { eq } from "drizzle-orm";
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
const db = drizzle(client);
export async function Pull(
  body: PullRequest,
  token_id: string,
): Promise<PullResponseV1> {
  console.log("Pull");
  if (body.pullVersion === 0) return versionNotSupported;
  let [token] = await db
    .select({ root_entity: permission_tokens.root_entity })
    .from(permission_tokens)
    .where(eq(permission_tokens.id, token_id));
  let facts: {
    attribute: string;
    created_at: string;
    data: any;
    entity: string;
    id: string;
    updated_at: string | null;
    version: number;
  }[] = [];
  let clientGroup = {};
  if (token) {
    let { data } = await supabase.rpc("get_facts", { root: token.root_entity });

    clientGroup = await getClientGroup(db, body.clientGroupID);
    facts = data || [];
  }

  return {
    cookie: Date.now(),
    lastMutationIDChanges: clientGroup,
    patch: [
      { op: "clear" },
      { op: "put", key: "initialized", value: true },
      ...facts.map((f) => {
        return {
          op: "put",
          key: f.id,
          value: FactWithIndexes(f as unknown as Fact<keyof typeof Attributes>),
        } as const;
      }),
    ],
  };
}

const versionNotSupported: VersionNotSupportedResponse = {
  error: "VersionNotSupported",
  versionType: "pull",
};
