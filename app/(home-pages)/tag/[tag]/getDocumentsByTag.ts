"use server";

import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/api";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";

export async function getDocumentsByTag(
  tag: string,
): Promise<{ posts: Post[] }> {
  // Normalize tag to lowercase for case-insensitive matching
  const normalizedTag = tag.toLowerCase();

  // Query documents that have this tag (case-insensitive)
  // Use ilike on the JSONB text cast to match regardless of stored case
  const { data: rawDocuments, error } = await supabaseServerClient
    .from("documents")
    .select(
      `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      documents_in_publications(publications(*))`,
    )
    .filter("data->>tags", "ilike", `%"${normalizedTag}"%`)
    .order("sort_date", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching documents by tag:", error);
    return { posts: [] };
  }

  // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
  const documents = deduplicateByUriOrdered(rawDocuments || []);

  const posts = await Promise.all(
    documents.map(async (doc) => {
      const pub = doc.documents_in_publications[0]?.publications;

      // Skip if document doesn't have a publication
      if (!pub) {
        return null;
      }

      // Normalize the document data - skip unrecognized formats
      const normalizedData = normalizeDocumentRecord(doc.data, doc.uri);
      if (!normalizedData) {
        return null;
      }

      const normalizedPubRecord = normalizePublicationRecord(pub?.record);

      const uri = new AtUri(doc.uri);
      const handle = await idResolver.did.resolve(uri.host);

      const post: Post = {
        publication: {
          href: getPublicationURL(pub),
          pubRecord: normalizedPubRecord,
          uri: pub?.uri || "",
        },
        author: handle?.alsoKnownAs?.[0]
          ? `@${handle.alsoKnownAs[0].slice(5)}`
          : null,
        documents: {
          comments_on_documents: doc.comments_on_documents,
          document_mentions_in_bsky: doc.document_mentions_in_bsky,
          data: normalizedData,
          uri: doc.uri,
          sort_date: doc.sort_date,
        },
      };
      return post;
    }),
  );

  // Filter out null entries (documents without publications)
  return {
    posts: posts.filter((p): p is Post => p !== null),
  };
}
