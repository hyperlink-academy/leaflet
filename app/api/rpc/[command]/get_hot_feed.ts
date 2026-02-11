import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { pool } from "supabase/pool";
import Client from "ioredis";
import { AtUri } from "@atproto/api";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";

let redisClient: Client | null = null;
if (process.env.REDIS_URL && process.env.NODE_ENV === "production") {
  redisClient = new Client(process.env.REDIS_URL);
}

const CACHE_KEY = "hot_feed_v1";
const CACHE_TTL = 300; // 5 minutes

export type GetHotFeedReturnType = Awaited<
  ReturnType<(typeof get_hot_feed)["handler"]>
>;

export const get_hot_feed = makeRoute({
  route: "get_hot_feed",
  input: z.object({}),
  handler: async ({}, { supabase }: Pick<Env, "supabase">) => {
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
        SELECT uri
        FROM documents
        WHERE indexed = true
          AND sort_date > now() - interval '7 days'
        ORDER BY
          (bsky_like_count + recommend_count * 5)::numeric
          / power(extract(epoch from (now() - sort_date)) / 3600 + 2, 1.5) DESC
        LIMIT 50
      `);
      uris = ranked.rows.map((row: any) => row.uri as string);
    } finally {
      client.release();
    }

    if (uris.length === 0) {
      return { posts: [] as Post[] };
    }

    // Batch-fetch documents with publication joins and interaction counts
    const { data: documents } = await supabase
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
    const docMap = new Map(
      (documents || []).map((d) => [d.uri, d]),
    );

    // Process in ranked order, deduplicating by identity key (DID/rkey)
    const seen = new Set<string>();
    const orderedDocs: (typeof documents extends (infer T)[] | null ? T : never)[] = [];
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
        orderedDocs.map(async (doc) => {
          const pub = doc.documents_in_publications?.[0]?.publications;
          const uri = new AtUri(doc.uri);
          const handle = await idResolver.did.resolve(uri.host);

          const normalizedData = normalizeDocumentRecord(doc.data, doc.uri);
          if (!normalizedData) return null;

          const normalizedPubRecord = pub
            ? normalizePublicationRecord(pub.record)
            : null;

          const post: Post = {
            publication: pub
              ? {
                  href: getPublicationURL(pub),
                  pubRecord: normalizedPubRecord,
                  uri: pub.uri || "",
                }
              : undefined,
            author: handle?.alsoKnownAs?.[0]
              ? `@${handle.alsoKnownAs[0].slice(5)}`
              : null,
            documents: {
              comments_on_documents: doc.comments_on_documents,
              document_mentions_in_bsky: doc.document_mentions_in_bsky,
              recommends_on_documents: doc.recommends_on_documents,
              data: normalizedData,
              uri: doc.uri,
              sort_date: doc.sort_date,
            },
          };
          return post;
        }),
      )
    ).filter((post): post is Post => post !== null);

    const response = { posts };

    // Cache in Redis
    if (redisClient) {
      await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(response));
    }

    return response;
  },
});
