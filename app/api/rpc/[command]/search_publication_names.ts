import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

export type SearchPublicationNamesReturnType = Awaited<
  ReturnType<(typeof search_publication_names)["handler"]>
>;

export const search_publication_names = makeRoute({
  route: "search_publication_names",
  input: z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
  handler: async ({ query, limit }, { supabase }: Pick<Env, "supabase">) => {
    // Search publications by name in record (case-insensitive partial match)
    const { data: publications, error } = await supabase
      .from("publications")
      .select("uri, record")
      .ilike("record->>name", `%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search publications: ${error.message}`);
    }

    const result = publications.map((p) => {
      const record = p.record as { name?: string };
      return {
        uri: p.uri,
        name: record.name || "Untitled",
        url: getPublicationURL(p),
      };
    });

    return { result: { publications: result } };
  },
});
