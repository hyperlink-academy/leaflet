import { z } from "zod";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { toPreviewFacts } from "src/utils/homeLeaflets";
import { makeRoute } from "../lib";
import type { Env } from "./route";

export const getFactsForRoots = makeRoute({
  route: "getFactsForRoots",
  input: z.object({
    roots: z.array(z.string()),
  }),
  handler: async ({ roots }, { supabase }: Pick<Env, "supabase">) => {
    const { data } = await supabase.rpc("get_facts_for_roots", {
      max_depth: 3,
      roots,
    });
    const byRoot = Map.groupBy(
      (data ?? []) as unknown as (Fact<Attribute> & { root_id: string })[],
      (f) => f.root_id,
    );
    const facts: { [root: string]: Fact<Attribute>[] } = {};
    for (const [root, rootFacts] of byRoot)
      facts[root] = toPreviewFacts(root, rootFacts);
    return { result: { facts } };
  },
});
