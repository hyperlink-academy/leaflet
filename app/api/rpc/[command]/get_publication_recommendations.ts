import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";

export type GetPublicationRecommendationsReturnType = Awaited<
  ReturnType<(typeof get_publication_recommendations)["handler"]>
>;

export const get_publication_recommendations = makeRoute({
  route: "get_publication_recommendations",
  input: z.object({
    publication: z.string(),
  }),
  handler: async ({ publication }, { supabase }: Pick<Env, "supabase">) => {
    // One row per edge; the indexer already dedupes, drops
    // self-recommendations, and caps the list at 3.
    const { data: rows } = await supabase
      .from("publication_recommendations")
      .select("recommendation")
      .eq("publication", publication)
      .order("sort_order", { ascending: true });

    return {
      result: { recommendations: (rows ?? []).map((r) => r.recommendation) },
    };
  },
});
