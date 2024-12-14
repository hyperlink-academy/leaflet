"use server";

import { createServerClient } from "@supabase/ssr";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { Database } from "supabase/database.types";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function getLeafletData(tokens: string[]) {
  //Eventually check permission tokens in here somehow!
  let all_facts = await supabase.rpc("get_facts_for_roots", {
    max_depth: 3,
    roots: tokens,
  });
  if (all_facts.data)
    return all_facts.data.reduce(
      (acc, fact) => {
        if (!acc[fact.root_id]) acc[fact.root_id] = [];
        acc[fact.root_id].push(
          fact as unknown as Fact<keyof typeof Attributes>,
        );
        return acc;
      },
      {} as { [key: string]: Fact<keyof typeof Attributes>[] },
    );
  return {};
}
