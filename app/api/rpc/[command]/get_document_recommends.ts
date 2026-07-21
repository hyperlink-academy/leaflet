import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";

export type GetDocumentRecommendsReturnType = Awaited<
  ReturnType<(typeof get_document_recommends)["handler"]>
>;

// The DIDs of everyone who has recommended a document, most recent first.
// Clients hydrate these into profiles via get_profiles. The recommend uri is a
// TID rkey, so ordering by uri descending approximates recency.
export const get_document_recommends = makeRoute({
  route: "get_document_recommends",
  input: z.object({
    document: z.string(),
  }),
  handler: async ({ document }, { supabase }: Pick<Env, "supabase">) => {
    const { data } = await supabase
      .from("recommends_on_documents")
      .select("recommender_did")
      .eq("document", document)
      .order("uri", { ascending: false });

    return {
      result: {
        dids: (data ?? []).map((r) => r.recommender_did),
      },
    };
  },
});
