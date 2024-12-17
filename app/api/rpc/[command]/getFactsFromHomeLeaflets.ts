import { z } from "zod";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { makeRoute } from "../lib";
import { Env } from "./route";

export const getFactsFromHomeLeaflets = makeRoute({
  route: "getFactsFromHomeLeaflets",
  input: z.object({
    tokens: z.array(z.string()),
  }),
  handler: async ({ tokens }, { supabase }: Pick<Env, "supabase">) => {
    let all_facts = await supabase.rpc("get_facts_for_roots", {
      max_depth: 3,
      roots: tokens,
    });

    if (all_facts.data) {
      return {
        result: all_facts.data.reduce(
          (acc, fact) => {
            if (!acc[fact.root_id]) acc[fact.root_id] = [];
            acc[fact.root_id].push(
              fact as unknown as Fact<keyof typeof Attributes>,
            );
            return acc;
          },
          {} as { [key: string]: Fact<keyof typeof Attributes>[] },
        ),
      };
    }

    return { result: {} };
  },
});
