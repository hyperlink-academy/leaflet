"use server";

import { getIdentityData } from "actions/getIdentityData";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { IdResolver } from "@atproto/identity";
import type { DidCache, CacheResult, DidDocument } from "@atproto/identity";
import Client from "ioredis";
import { AtUri } from "@atproto/api";
import { idResolver } from "./idResolver";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

export type Cursor = {
  timestamp: string;
  uri: string;
};

export async function getReaderFeed(
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  let auth_res = await getIdentityData();
  if (!auth_res?.atp_did) return { posts: [], nextCursor: null };
  let query = supabaseServerClient
    .from("documents")
    .select(
      `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      documents_in_publications!inner(publications!inner(*, publication_subscriptions!inner(*)))`,
    )
    .eq(
      "documents_in_publications.publications.publication_subscriptions.identity",
      auth_res.atp_did,
    )
    .order("indexed_at", { ascending: false })
    .order("uri", { ascending: false })
    .limit(25);
  if (cursor) {
    query = query.or(
      `indexed_at.lt.${cursor.timestamp},and(indexed_at.eq.${cursor.timestamp},uri.lt.${cursor.uri})`,
    );
  }
  let { data: feed, error } = await query;

  let posts = (
    await Promise.all(
      feed?.map(async (post) => {
        let pub = post.documents_in_publications[0].publications!;
        let uri = new AtUri(post.uri);
        let handle = await idResolver.did.resolve(uri.host);

        // Normalize records - filter out unrecognized formats
        const normalizedData = normalizeDocumentRecord(post.data);
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
            data: normalizedData,
            uri: post.uri,
            indexed_at: post.indexed_at,
          },
        };
        return p;
      }) || [],
    )
  ).filter((post): post is Post => post !== null);
  const nextCursor =
    posts.length > 0
      ? {
          timestamp: posts[posts.length - 1].documents.indexed_at,
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
    indexed_at: string;
    comments_on_documents: { count: number }[] | undefined;
    document_mentions_in_bsky: { count: number }[] | undefined;
  };
};
