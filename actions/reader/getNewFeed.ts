"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
import { enrichDocumentToPost } from "src/utils/enrichPost";
import { dropHeld } from "src/publicationReview/held";
import type { Cursor, Post } from "./getReaderFeed";

// A page can come back with every row held back (a spam farm's burst). The
// reader treats an empty first page as an empty feed, so keep walking until a
// post survives.
const EMPTY_PAGES_SKIPPED = 8;

export async function getNewFeed(
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  let page = await newFeedPage(cursor);
  for (
    let skipped = 0;
    page.posts.length === 0 && page.nextCursor && skipped < EMPTY_PAGES_SKIPPED;
    skipped++
  )
    page = await newFeedPage(page.nextCursor);
  return page;
}

async function newFeedPage(
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  // plan-checked: this is the global discover feed, so the newest-first walk
  // of documents_sort_date_idx is the intended access path — the filters
  // (document is in a publication, not opted out of Discover) exclude only a
  // small minority of recent documents, so the limit short-circuits after a
  // few index entries. Revisit if either filter ever becomes selective.
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
    // Exclude posts published "quietly" (the document record opts itself out of
    // Discover). Absent/true is kept; only an explicit false is hidden.
    .or(
      "data->preferences->showInDiscover.is.null,data->preferences->>showInDiscover.eq.true",
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

  const feed = await dropHeld(
    deduplicateByUriOrdered(rawFeed || []),
    (d) => d.documents_in_publications.map((p) => p.publications.uri),
    (d) => d.uri,
  );

  let posts = (
    await Promise.all(feed.map((post) => enrichDocumentToPost(post as any)))
  ).filter((post): post is Post => post !== null);

  // From the last row fetched, not the last post shown, so a page whose tail
  // (or whole) was held back still advances.
  const last = rawFeed?.[rawFeed.length - 1];
  const nextCursor = last?.sort_date
    ? { timestamp: last.sort_date, uri: last.uri }
    : null;

  return {
    posts,
    nextCursor,
  };
}
