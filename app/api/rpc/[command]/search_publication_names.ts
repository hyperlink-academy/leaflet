import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";

export type SearchPublicationNamesReturnType = Awaited<
  ReturnType<(typeof search_publication_names)["handler"]>
>;

export const search_publication_names = makeRoute({
  route: "search_publication_names",
  input: z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
  handler: async (
    { query, limit },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    // Search publications by name (case-insensitive partial match)
    const { data: publications, error } = await supabase
      .from("publications")
      .select("uri, name, identity_did, record")
      .ilike("name", `%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search publications: ${error.message}`);
    }

    return { result: { publications } };
  },
});
