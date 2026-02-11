"use server";

import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/api";
import { idResolver } from "./idResolver";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
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
    await Promise.all(
      feed.map(async (post) => {
        let pub = post.documents_in_publications[0]?.publications!;
        let uri = new AtUri(post.uri);
        let handle = await idResolver.did.resolve(uri.host);

        const normalizedData = normalizeDocumentRecord(post.data, post.uri);
        if (!normalizedData) return null;

        const normalizedPubRecord = normalizePublicationRecord(pub?.record);

        let p: Post = {
          publication: {
            href: getPublicationURL(pub),
            pubRecord: normalizedPubRecord,
            uri: pub?.uri || "",
          },
          author: handle?.alsoKnownAs?.[0]
            ? `@${handle.alsoKnownAs[0].slice(5)}`
            : null,
          documents: {
            comments_on_documents: post.comments_on_documents,
            document_mentions_in_bsky: post.document_mentions_in_bsky,
            recommends_on_documents: post.recommends_on_documents,
            data: normalizedData,
            uri: post.uri,
            sort_date: post.sort_date,
          },
        };
        return p;
      }) || [],
    )
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
