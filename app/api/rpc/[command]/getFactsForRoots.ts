import { z } from "zod";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
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
    const facts: { [root: string]: Fact<Attribute>[] } = {};
    for (const f of data ?? []) {
      (facts[f.root_id] ??= []).push(f as unknown as Fact<Attribute>);
    }
    return { result: { facts } };
  },
});
