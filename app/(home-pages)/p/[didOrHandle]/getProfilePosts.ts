"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";

export type Cursor = {
  sort_date: string;
  uri: string;
};

export async function getProfilePosts(
  did: string,
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  const limit = 20;

  let [{ data: rawFeed, error }, { data: profile }] = await Promise.all([
    supabaseServerClient.rpc("get_profile_posts", {
      p_did: did,
      p_cursor_sort_date: cursor?.sort_date ?? undefined,
      p_cursor_uri: cursor?.uri ?? undefined,
      p_limit: limit,
    }),
    supabaseServerClient
      .from("bsky_profiles")
      .select("handle")
      .eq("did", did)
      .single(),
  ]);

  if (error) {
    console.error("[getProfilePosts] rpc error:", error);
    return { posts: [], nextCursor: null };
  }

  let feed = deduplicateByUriOrdered(rawFeed || []);
  if (feed.length === 0) return { posts: [], nextCursor: null };

  let handle = profile?.handle ? `@${profile.handle}` : null;
  let posts: Post[] = [];

  for (let row of feed) {
    const normalizedData = normalizeDocumentRecord(row.data, row.uri);
    if (!normalizedData) continue;

    const normalizedPubRecord = row.publication_record
      ? normalizePublicationRecord(row.publication_record)
      : null;

    let post: Post = {
      author: handle,
      documents: {
        data: normalizedData,
        uri: row.uri,
        sort_date: row.sort_date,
        comments_on_documents: [{ count: Number(row.comments_count) }],
        document_mentions_in_bsky: [{ count: Number(row.mentions_count) }],
        recommends_on_documents: [{ count: Number(row.recommends_count) }],
      },
    };

    if (row.publication_uri) {
      post.publication = {
        href: getPublicationURL({
          uri: row.publication_uri,
          record: row.publication_record,
        }),
        pubRecord: normalizedPubRecord,
        uri: row.publication_uri,
      };
    }

    posts.push(post);
  }

  const nextCursor =
    posts.length === limit
      ? {
          sort_date: posts[posts.length - 1].documents.sort_date,
          uri: posts[posts.length - 1].documents.uri,
        }
      : null;

  return { posts, nextCursor };
}
