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
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
const db = drizzle(client);
export async function Pull(
  body: PullRequest,
  rootEntity: string,
): Promise<PullResponseV1> {
  console.log("Pull");
  if (body.pullVersion === 0) return versionNotSupported;
  let { data } = await supabase.rpc("get_facts", { root: rootEntity });
  let facts = data || [];
  let clientGroup = await getClientGroup(db, body.clientGroupID);

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
