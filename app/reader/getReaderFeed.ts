"use server";

import { getIdentityData } from "actions/getIdentityData";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { IdResolver } from "@atproto/identity";
import type { DidCache, CacheResult, DidDocument } from "@atproto/identity";
import Client from "ioredis";
import { AtUri } from "@atproto/api";
import { Json } from "supabase/database.types";

// Create Redis client for DID caching
let redisClient: Client | null = null;
if (process.env.REDIS_URL) {
  redisClient = new Client(process.env.REDIS_URL);
}

// Redis-based DID cache implementation
class RedisDidCache implements DidCache {
  private staleTTL: number;
  private maxTTL: number;

  constructor(
    private client: Client,
    staleTTL = 60 * 60, // 1 hour
    maxTTL = 60 * 60 * 24, // 24 hours
  ) {
    this.staleTTL = staleTTL;
    this.maxTTL = maxTTL;
  }

  async cacheDid(did: string, doc: DidDocument): Promise<void> {
    const cacheVal = {
      doc,
      updatedAt: Date.now(),
    };
    await this.client.setex(
      `did:${did}`,
      this.maxTTL,
      JSON.stringify(cacheVal),
    );
  }

  async checkCache(did: string): Promise<CacheResult | null> {
    const cached = await this.client.get(`did:${did}`);
    if (!cached) return null;

    const { doc, updatedAt } = JSON.parse(cached);
    const now = Date.now();
    const age = now - updatedAt;

    return {
      did,
      doc,
      updatedAt,
      stale: age > this.staleTTL * 1000,
      expired: age > this.maxTTL * 1000,
    };
  }

  async refreshCache(
    did: string,
    getDoc: () => Promise<DidDocument | null>,
  ): Promise<void> {
    const doc = await getDoc();
    if (doc) {
      await this.cacheDid(did, doc);
    }
  }

  async clearEntry(did: string): Promise<void> {
    await this.client.del(`did:${did}`);
  }

  async clear(): Promise<void> {
    const keys = await this.client.keys("did:*");
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}

// Create IdResolver with Redis-based DID cache
const idResolver = new IdResolver({
  didCache: redisClient ? new RedisDidCache(redisClient) : undefined,
});

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
