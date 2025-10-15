"use server";

import { getIdentityData } from "actions/getIdentityData";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { IdResolver } from "@atproto/identity";
import type { DidCache, CacheResult, DidDocument } from "@atproto/identity";
import Client from "ioredis";
import { AtUri } from "@atproto/api";
import { Json } from "supabase/database.types";
import { idResolver } from "./idResolver";

export async function getReaderFeed(
  cursor?: string | null,
): Promise<{ posts: Post[]; nextCursor: string | null }> {
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
    .limit(25);
  if (cursor) query.lt("indexed_at", cursor);
  let { data: feed, error } = await query;

  let posts = await Promise.all(
    feed?.map(async (post) => {
      let pub = post.documents_in_publications[0].publications!;
      let uri = new AtUri(post.uri);
      let handle = await idResolver.did.resolve(uri.host);
      let p: Post = {
        publication: {
          href: getPublicationURL(pub),
          pubRecord: pub?.record || null,
          uri: pub?.uri || "",
        },
        author: handle,
        documents: {
          comments_on_documents: post.comments_on_documents,
          document_mentions_in_bsky: post.document_mentions_in_bsky,
          data: post.data,
          uri: post.uri,
          indexed_at: post.indexed_at,
        },
      };
      return p;
    }) || [],
  );
  return {
    posts,
    nextCursor: posts[posts.length - 1]?.documents.indexed_at || null,
  };
}

export type Post = {
  author: DidDocument | null;
  publication: {
    href: string;
    pubRecord: Json;
    uri: string;
  };
  documents: {
    data: Json;
    uri: string;
    indexed_at: string;
    comments_on_documents:
      | {
          count: number;
        }[]
      | undefined;
    document_mentions_in_bsky:
      | {
          count: number;
        }[]
      | undefined;
  };
};
