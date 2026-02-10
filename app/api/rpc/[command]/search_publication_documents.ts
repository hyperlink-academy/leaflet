import { AtUri } from "@atproto/api";
import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";

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
    // Also join with publications to get the record for URL construction
    const { data: documents, error } = await supabase
      .from("documents_in_publications")
      .select(
        "document, documents!inner(uri, data), publications!inner(uri, record)",
      )
      .eq("publication", publication_uri)
      .ilike("documents.data->>title", `%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(
        `Failed to search publication documents: ${error.message}`,
      );
    }

    const result = documents.map((d) => {
      const normalizedDoc = normalizeDocumentRecord(d.documents.data, d.documents.uri);

      return {
        uri: d.documents.uri,
        title: normalizedDoc?.title || (d.documents.data as { title?: string })?.title || "Untitled",
        url: normalizedDoc
          ? getDocumentURL(normalizedDoc, d.documents.uri, d.publications)
          : `${d.documents.uri}`,
      };
    });

    return { result: { documents: result } };
  },
});
