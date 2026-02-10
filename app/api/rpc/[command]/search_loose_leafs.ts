import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { deduplicateByUri } from "src/utils/deduplicateRecords";

export type SearchLooseLeafsReturnType = Awaited<
  ReturnType<(typeof search_loose_leafs)["handler"]>
>;

export const search_loose_leafs = makeRoute({
  route: "search_loose_leafs",
  input: z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
  handler: async (
    { query, limit },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    // Search for documents that are NOT in any publication (loose leafs)
    // A loose leaf is a document with no entry in documents_in_publications
    const { data: rawLooseLeafs, error } = await supabase
      .from("documents")
      .select("uri, data")
      .ilike("data->>title", `%${query}%`)
      .not("uri", "in", supabase.from("documents_in_publications").select("document"))
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search loose leafs: ${error.message}`);
    }

    // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
    const looseLeafs = deduplicateByUri(rawLooseLeafs || []);

    const result = looseLeafs.map((d) => ({
      uri: d.uri,
      title: (d.data as { title?: string })?.title || "Untitled",
    }));

    return { result: { documents: result } };
  },
});
