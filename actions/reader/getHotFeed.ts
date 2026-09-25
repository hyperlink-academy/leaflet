"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { pool } from "supabase/pool";
import Client from "ioredis";
import { AtUri } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import { enrichDocumentToPost } from "src/utils/enrichPost";
import { TRENDING_RANK } from "src/utils/trendingRank";
import type { Post } from "./getReaderFeed";

let redisClient: Client | null = null;
if (process.env.REDIS_URL && process.env.NODE_ENV === "production") {
  redisClient = new Client(process.env.REDIS_URL);
}

const CACHE_KEY = "hot_feed_v1";
const CACHE_TTL = 300; // 5 minutes

export async function getHotFeed(): Promise<{ posts: Post[] }> {
  // Check Redis cache
  if (redisClient) {
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as { posts: Post[] };
    }
  }

  // Run ranked SQL query to get top 50 URIs
  const client = await pool.connect();
  const db = drizzle(client);

  let uris: string[];
  try {
    const ranked = await db.execute(sql`
      SELECT d.uri
      FROM documents d
      WHERE d.indexed = true
        AND d.sort_date > now() - interval '7 days'
        AND (
          d.data->'preferences'->>'showInDiscover' IS NULL
          OR d.data->'preferences'->>'showInDiscover' = 'true'
        )
      ORDER BY ${TRENDING_RANK} DESC
      LIMIT 50
    `);
    uris = ranked.rows.map((row: any) => row.uri as string);
  } finally {
    client.release();
  }

  if (uris.length === 0) {
    return { posts: [] };
  }

  // Batch-fetch documents with publication joins and interaction counts
  const { data: documents } = await supabaseServerClient
    .from("documents")
    .select(
      `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      recommends_on_documents(count),
      documents_in_publications(publications(*))`,
    )
    .in("uri", uris);

  // Build lookup map for enrichment
  const docMap = new Map((documents || []).map((d) => [d.uri, d]));

  // Process in ranked order, deduplicating by identity key (DID/rkey)
  const seen = new Set<string>();
  const orderedDocs: NonNullable<typeof documents>[number][] = [];
  for (const uri of uris) {
    try {
      const parsed = new AtUri(uri);
      const identityKey = `${parsed.host}/${parsed.rkey}`;
      if (seen.has(identityKey)) continue;
      seen.add(identityKey);
    } catch {
      // invalid URI, skip dedup check
    }
    const doc = docMap.get(uri);
    if (doc) orderedDocs.push(doc);
  }

  // Enrich into Post[]
  const posts = (
    await Promise.all(
      orderedDocs.map((doc) => enrichDocumentToPost(doc as any)),
    )
  ).filter((post): post is Post => post !== null);

  const response = { posts };

  // Cache in Redis
  if (redisClient) {
    await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(response));
  }

  return response;
}
