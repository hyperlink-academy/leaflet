"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
import { enrichDocumentToPost } from "./enrichPost";
import type { Cursor, Post } from "./getReaderFeed";

export async function getNewFeed(
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  let query = supabaseServerClient
    .from("documents")
    .select(
      `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      recommends_on_documents(count),
      documents_in_publications!inner(publications!inner(*))`,
    )
    .or(
      "record->preferences->showInDiscover.is.null,record->preferences->>showInDiscover.eq.true",
      { referencedTable: "documents_in_publications.publications" },
    )
    .order("sort_date", { ascending: false })
    .order("uri", { ascending: false })
    .limit(25);

  if (cursor) {
    query = query.or(
      `sort_date.lt.${cursor.timestamp},and(sort_date.eq.${cursor.timestamp},uri.lt.${cursor.uri})`,
    );
  }

  let { data: rawFeed, error } = await query;

  const feed = deduplicateByUriOrdered(rawFeed || []);

  let posts = (
    await Promise.all(feed.map((post) => enrichDocumentToPost(post as any)))
  ).filter((post): post is Post => post !== null);

  const nextCursor =
    posts.length > 0
      ? {
          timestamp: posts[posts.length - 1].documents.sort_date,
          uri: posts[posts.length - 1].documents.uri,
        }
      : null;

  return {
    posts,
    nextCursor,
  };
}
