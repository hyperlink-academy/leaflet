import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getPublicationURL } from "src/utils/getPublicationURL";

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
    // Migrated pubs still have a stale pub.leaflet twin in the table; without
    // an ORDER BY it can make the limit while the current record does not, so
    // only the standard-site namespace is searched.
    const { data: publications, error } = await supabase
      .from("publications")
      .select("uri, record")
      .like("uri", "at://%/site.standard.publication/%")
      .ilike("record->>name", `%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search publications: ${error.message}`);
    }

    const result = (publications || []).map((p) => {
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
