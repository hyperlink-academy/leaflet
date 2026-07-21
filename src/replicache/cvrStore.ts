import type { CVR } from "./cvr";

// One CVR slot per token+clientGroup, overwritten on every advancing pull, so
// normal editing churn never accumulates entries. A cvrID match guards the
// slot: a client whose cookie no longer matches (lost pull response, slot
// evicted) just gets a full snapshot and re-converges. The TTL only garbage
// collects abandoned client groups — replicache's own cookie monotonicity
// makes stale slots unreachable, not incorrect.
const KEY_PREFIX = "replicache-cvr:";
const TTL_SECONDS = 60 * 60 * 24 * 30;

export type StoredCVR = CVR & { id: string };

// The subset of ioredis used, so tests can substitute a Map-backed fake.
export type RedisLike = {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
};

export type CVRStore = {
  get(key: string, cvrID: string): Promise<CVR | null>;
  set(key: string, cvr: StoredCVR): Promise<void>;
};

// A missing/erroring store must never fail a pull — every degraded path
// returns null, which buildPullResponse answers with a full snapshot.
export function makeCVRStore(redis: RedisLike | null): CVRStore {
  return {
    async get(key, cvrID) {
      if (!redis) return null;
      try {
        let raw = await redis.get(KEY_PREFIX + key);
        if (!raw) return null;
        let stored = JSON.parse(raw) as StoredCVR;
        return stored.id === cvrID ? stored : null;
      } catch (e) {
        console.error("[cvrStore] get failed:", e);
        return null;
      }
    },
    async set(key, cvr) {
      if (!redis) return;
      try {
        await redis.setex(KEY_PREFIX + key, TTL_SECONDS, JSON.stringify(cvr));
      } catch (e) {
        console.error("[cvrStore] set failed:", e);
      }
    },
  };
}
