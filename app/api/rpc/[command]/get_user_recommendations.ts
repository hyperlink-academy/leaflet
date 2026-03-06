import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getIdentityData } from "actions/getIdentityData";

export type GetUserRecommendationsReturnType = Awaited<
  ReturnType<(typeof get_user_recommendations)["handler"]>
>;

export const get_user_recommendations = makeRoute({
  route: "get_user_recommendations",
  input: z.object({
    documentUris: z.array(z.string()),
  }),
  handler: async ({ documentUris }, { supabase }: Pick<Env, "supabase">) => {
    const identity = await getIdentityData();
    const currentUserDid = identity?.atp_did;

    if (!currentUserDid || documentUris.length === 0) {
      return {
        result: {} as Record<string, boolean>,
      };
    }

    const { data: recommendations } = await supabase
      .from("recommends_on_documents")
      .select("document")
      .eq("recommender_did", currentUserDid)
      .in("document", documentUris);

    const recommendedSet = new Set(recommendations?.map((r) => r.document));

    const result: Record<string, boolean> = {};
    for (const uri of documentUris) {
      result[uri] = recommendedSet.has(uri);
    }

    return { result };
  },
});
