import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";

export type SearchPublicationDocumentsReturnType = Awaited<
  ReturnType<(typeof search_publication_documents)["handler"]>
>;

export const search_publication_documents = makeRoute({
  route: "search_publication_documents",
  input: z.object({
    publication_uri: z.string(),
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
  handler: async (
    { publication_uri, query, limit },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    // Get documents in the publication, filtering by title using JSON operator
    const { data: documents, error } = await supabase
      .from("documents_in_publications")
      .select("document, documents!inner(uri, data)")
      .eq("publication", publication_uri)
      .ilike("documents.data->>title", `%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(
        `Failed to search publication documents: ${error.message}`,
      );
    }

    const result = documents.map((d) => ({
      uri: d.documents.uri,
      title: (d.documents.data as { title?: string })?.title || "Untitled",
    }));

    return { result: { documents: result } };
  },
});
