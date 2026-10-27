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
    // One call per root: given several, the function walks them one after
    // another, and the home page waits on this for its first screen.
    const results = await Promise.all(
      roots.map((root) =>
        supabase.rpc("get_facts_for_roots", { roots: [root], max_depth: 3 }),
      ),
    );
    const facts: { [root: string]: Fact<Attribute>[] } = {};
    roots.forEach((root, i) => {
      facts[root] = toPreviewFacts(
        root,
        (results[i].data ?? []) as unknown as Fact<Attribute>[],
      );
    });
    return { result: { facts } };
  },
});
