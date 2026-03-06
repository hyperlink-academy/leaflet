"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import type {
  NormalizedDocument,
  NormalizedPublication,
} from "src/utils/normalizeRecords";
import { enrichDocumentToPost } from "./enrichPost";

export type Cursor = {
  timestamp: string;
  uri: string;
};

export async function getReaderFeed(
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  let auth_res = await getIdentityData();
  if (!auth_res?.atp_did) return { posts: [], nextCursor: null };

  const { data: rawFeed, error } = await supabaseServerClient.rpc(
    "get_reader_feed",
    {
      p_identity: auth_res.atp_did,
      p_cursor_timestamp: cursor?.timestamp,
      p_cursor_uri: cursor?.uri,
      p_limit: 25,
    },
  );
  if (error) {
    console.error("[getReaderFeed] rpc error:", error);
    return { posts: [], nextCursor: null };
  }

  if (rawFeed.length === 0) return { posts: [], nextCursor: null };

  // Reshape rows to match the structure enrichDocumentToPost expects
  const feed = rawFeed.map((row: any) => ({
    uri: row.uri,
    data: row.data,
    sort_date: row.sort_date,
    comments_on_documents: [{ count: Number(row.comments_count) }],
    document_mentions_in_bsky: [{ count: Number(row.mentions_count) }],
    recommends_on_documents: [{ count: Number(row.recommends_count) }],
    documents_in_publications: row.publication_uri
      ? [
          {
            publications: {
              uri: row.publication_uri,
              record: row.publication_record,
              name: row.publication_name,
            },
          },
        ]
      : [],
  }));

  let posts = (
    await Promise.all(feed.map((post) => enrichDocumentToPost(post as any)))
  ).filter((post): post is Post => post !== null);
  if (feed.length > 0 && posts.length !== feed.length) {
    console.log(`[getReaderFeed] ${feed.length - posts.length}/${feed.length} posts dropped during enrichment`);
  }

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

export type Post = {
  author: string | null;
  publication?: {
    href: string;
    pubRecord: NormalizedPublication | null;
    uri: string;
  };
  documents: {
    data: NormalizedDocument | null;
    uri: string;
    sort_date: string;
    comments_on_documents: { count: number }[] | undefined;
    document_mentions_in_bsky: { count: number }[] | undefined;
    recommends_on_documents: { count: number }[] | undefined;
    mentionsCount?: number;
  };
};
