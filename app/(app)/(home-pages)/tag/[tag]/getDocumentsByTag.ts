"use server";

import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/api";
import { idResolver } from "src/identity";
import type { Post } from "app/(app)/(home-pages)/reader/getReaderFeed";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
import { resolveBylineProfiles } from "src/utils/resolveBylineProfiles";

export type Cursor = {
  sort_date: string;
  uri: string;
};

const PAGE_SIZE = 50;

export async function getDocumentsByTag(
  tag: string,
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  // Fetch tagged documents through a SQL function that drives the query from the
  // indexed document_tags table. A plain PostgREST filter with ORDER BY sort_date
  // + LIMIT lets the planner walk the sort_date index probing for tag matches,
  // which scans most of the documents table for rare tags and hits the statement
  // timeout. Tags in document_tags are lowercased, and tag links are lowercased
  // (they come from search_tags), so match against the lowercased tag.
  const { data: rawDocuments, error } = await supabaseServerClient.rpc(
    "get_documents_by_tag",
    {
      p_tag: tag.toLowerCase(),
      p_cursor_sort_date: cursor?.sort_date ?? undefined,
      p_cursor_uri: cursor?.uri ?? undefined,
      p_limit: PAGE_SIZE,
    },
  );

  if (error) {
    console.error("Error fetching documents by tag:", error);
    return { posts: [], nextCursor: null };
  }

  const rows = rawDocuments || [];

  // Base the cursor on the raw rows (before dedup/normalization drops any), so
  // pagination doesn't stop early when a page loses rows to client-side filtering.
  const lastRow = rows[rows.length - 1];
  const nextCursor: Cursor | null =
    rows.length === PAGE_SIZE && lastRow
      ? { sort_date: lastRow.sort_date, uri: lastRow.uri }
      : null;

  // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
  const documents = deduplicateByUriOrdered(rows);

  const posts = await Promise.all(
    documents.map(async (doc) => {
      // Normalize the document data - skip unrecognized formats
      const normalizedData = normalizeDocumentRecord(doc.data, doc.uri);
      if (!normalizedData) {
        return null;
      }

      const normalizedPubRecord = normalizePublicationRecord(
        doc.publication_record,
      );

      const uri = new AtUri(doc.uri);
      const handle = await idResolver.did.resolve(uri.host);

      const post: Post = {
        publication: {
          href: getPublicationURL({
            uri: doc.publication_uri,
            record: doc.publication_record,
          }),
          pubRecord: normalizedPubRecord,
          uri: doc.publication_uri,
        },
        author: handle?.alsoKnownAs?.[0]
          ? `@${handle.alsoKnownAs[0].slice(5)}`
          : null,
        contributors: await resolveBylineProfiles(normalizedData, uri.host),
        documents: {
          comments_on_documents: [{ count: Number(doc.comments_count) }],
          document_mentions_in_bsky: [{ count: Number(doc.mentions_count) }],
          recommends_on_documents: [{ count: Number(doc.recommends_count) }],
          data: normalizedData,
          uri: doc.uri,
          sort_date: doc.sort_date,
        },
      };
      return post;
    }),
  );

  // Filter out null entries (documents with unrecognized data formats)
  return {
    posts: posts.filter((p): p is Post => p !== null),
    nextCursor,
  };
}
