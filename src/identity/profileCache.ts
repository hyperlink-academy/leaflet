import { cache } from "react";
import Client from "ioredis";
import { getPublicAgent } from "app/api/bsky/agent";

export type Profile = {
  did: string;
  handle: string | null;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
};

const KEY_PREFIX = "bsky-profile:";
// 30d TTL — the firehose keeps entries fresh; TTL is just GC.
const MAX_TTL = 60 * 60 * 24 * 30;
const BATCH_SIZE = 25;

let redisClient: Client | null = null;
if (process.env.REDIS_URL && process.env.NODE_ENV === "production") {
  redisClient = new Client(process.env.REDIS_URL);
}

type CachedEntry = { profile: Profile | null; updatedAt: number };

function profileKey(did: string) {
  return `${KEY_PREFIX}${did}`;
}

async function readCache(dids: string[]): Promise<Map<string, Profile | null>> {
  const out = new Map<string, Profile | null>();
  if (!redisClient || dids.length === 0) return out;

  const keys = dids.map(profileKey);
  const raw = await redisClient.mget(...keys);
  raw.forEach((value, i) => {
    if (!value) return;
    try {
      const entry = JSON.parse(value) as CachedEntry;
      const age = Date.now() - entry.updatedAt;
      if (age <= MAX_TTL * 1000) {
        out.set(dids[i], entry.profile);
      }
    } catch {
      // skip malformed entry
    }
  });
  return out;
}

async function writeCache(entries: Map<string, Profile | null>): Promise<void> {
  if (!redisClient || entries.size === 0) return;

  const pipeline = redisClient.pipeline();
  const now = Date.now();
  for (const [did, profile] of entries) {
    const entry: CachedEntry = { profile, updatedAt: now };
    pipeline.setex(profileKey(did), MAX_TTL, JSON.stringify(entry));
  }
  await pipeline.exec();
}

type FetchResult = {
  results: Map<string, Profile | null>;
  toCache: Map<string, Profile | null>;
};

async function fetchProfiles(dids: string[]): Promise<FetchResult> {
  const results = new Map<string, Profile | null>();
  const toCache = new Map<string, Profile | null>();
  for (const did of dids) results.set(did, null);
  if (dids.length === 0) return { results, toCache };

  // getProfiles is a public AppView read — no auth needed. Using a public agent
  // avoids restoring the viewer's OAuth session on every render (which races
  // concurrent token refreshes and triggers "refreshToken replayed").
  const agent = getPublicAgent();
  const batches: string[][] = [];
  for (let i = 0; i < dids.length; i += BATCH_SIZE) {
    batches.push(dids.slice(i, i + BATCH_SIZE));
  }

  await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await agent.app.bsky.actor.getProfiles({ actors: batch });
        const returned = new Set<string>();
        for (const p of res.data.profiles) {
          const profile: Profile = {
            did: p.did,
            handle: p.handle ?? null,
            displayName: p.displayName ?? null,
            avatar: p.avatar ?? null,
            description: p.description ?? null,
          };
          results.set(p.did, profile);
          toCache.set(p.did, profile);
          returned.add(p.did);
        }
        // DIDs the API confirmed don't exist — safe to negative-cache.
        for (const did of batch) {
          if (!returned.has(did)) toCache.set(did, null);
        }
      } catch (err) {
        // Transient failure — leave results as null but don't write to
        // cache, so the next request retries instead of getting a stale miss.
        console.error("[profileCache] getProfiles failed:", err);
      }
    }),
  );

  return { results, toCache };
}

export const getProfiles = cache(
  async (dids: string[]): Promise<Map<string, Profile | null>> => {
    const unique = Array.from(new Set(dids));
    const result = new Map<string, Profile | null>();
    if (unique.length === 0) return result;

    const cached = await readCache(unique);
    for (const [did, profile] of cached) result.set(did, profile);

    const missing = unique.filter((did) => !cached.has(did));
    if (missing.length === 0) return result;

    const { results: fetched, toCache } = await fetchProfiles(missing);
    for (const [did, profile] of fetched) result.set(did, profile);

    await writeCache(toCache);
    return result;
  },
);
