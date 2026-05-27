import { cache } from "react";
import Client from "ioredis";
import { getAgent } from "app/api/bsky/agent";

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

async function fetchProfiles(dids: string[]): Promise<Map<string, Profile | null>> {
  const out = new Map<string, Profile | null>();
  for (const did of dids) out.set(did, null);
  if (dids.length === 0) return out;

  const agent = await getAgent();
  for (let i = 0; i < dids.length; i += BATCH_SIZE) {
    const batch = dids.slice(i, i + BATCH_SIZE);
    try {
      const res = await agent.app.bsky.actor.getProfiles({ actors: batch });
      for (const p of res.data.profiles) {
        out.set(p.did, {
          did: p.did,
          handle: p.handle ?? null,
          displayName: p.displayName ?? null,
          avatar: p.avatar ?? null,
          description: p.description ?? null,
        });
      }
    } catch (err) {
      console.error("[profileCache] getProfiles failed:", err);
      // Leave nulls in place — they'll be cached as negative results.
    }
  }
  return out;
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

    const fetched = await fetchProfiles(missing);
    for (const [did, profile] of fetched) result.set(did, profile);

    await writeCache(fetched);
    return result;
  },
);
