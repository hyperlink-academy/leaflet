"use server";

import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/api";
import { Json } from "supabase/database.types";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";

export async function getDocumentsByTag(
  tag: string,
): Promise<{ posts: Post[] }> {
  // Normalize tag to lowercase for case-insensitive search
  const normalizedTag = tag.toLowerCase();

  // Query documents that have this tag
  const { data: documents, error } = await supabaseServerClient
    .from("documents")
    .select(
      `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      documents_in_publications(publications(*))`,
    )
    .contains("data->tags", `["${normalizedTag}"]`)
    .order("indexed_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching documents by tag:", error);
    return { posts: [] };
  }

  const posts = await Promise.all(
    documents.map(async (doc) => {
      const pub = doc.documents_in_publications[0]?.publications;

      // Skip if document doesn't have a publication
      if (!pub) {
        return null;
      }

      const uri = new AtUri(doc.uri);
      const handle = await idResolver.did.resolve(uri.host);

      const post: Post = {
        publication: {
          href: getPublicationURL(pub),
          pubRecord: pub?.record || null,
          uri: pub?.uri || "",
        },
        author: handle?.alsoKnownAs?.[0]
          ? `@${handle.alsoKnownAs[0].slice(5)}`
          : null,
        documents: {
          comments_on_documents: doc.comments_on_documents,
          document_mentions_in_bsky: doc.document_mentions_in_bsky,
          data: doc.data,
          uri: doc.uri,
          indexed_at: doc.indexed_at,
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
