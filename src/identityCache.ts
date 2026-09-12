import { getRedis } from "src/redis";

// Redis-backed read-through cache for the identity slices (src/identitySlices.ts
// owns the keys and the invalidation policy). Deliberately not a "use server"
// module: exporting an async fn from one would publish it as a client-callable
// endpoint.

// 30s is the staleness ceiling for writers that can't invalidate a user's
// slices: actions taken by other users (contributor changes, the appview
// re-indexing a publication record) and the per-keystroke title writes on the
// Replicache push path. Everything else calls invalidateIdentitySlices and is
// immediately consistent.
const TTL_SECONDS = 30;

export type IdentityCacheStore = {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
};

// Redis is an optimisation on a path that can always fall back to Postgres, so
// an outage degrades to uncached reads (and to at most TTL_SECONDS of
// staleness on a failed invalidation) rather than failing every render.
function degrade(op: string) {
  return (err: unknown) => {
    console.error(`[identityCache] ${op} failed:`, err);
    return null;
  };
}

const inFlight = new Map<string, Promise<unknown>>();

export async function getCached<T>(
  key: string,
  fetchFresh: () => Promise<T>,
  store: IdentityCacheStore | null = getRedis(),
): Promise<T> {
  if (!store) return fetchFresh();
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = (async () => {
    const cached = await store.get(key).catch(degrade("read"));
    if (cached != null) {
      try {
        return JSON.parse(cached) as T;
      } catch {}
    }
    const fresh = await fetchFresh();
    await store
      .setex(key, TTL_SECONDS, JSON.stringify(fresh))
      .catch(degrade("write"));
    return fresh;
  })();
  inFlight.set(key, pending);
  try {
    return (await pending) as T;
  } finally {
    inFlight.delete(key);
  }
}

export async function writeCached(
  key: string,
  value: unknown,
  store: IdentityCacheStore | null = getRedis(),
) {
  if (!store) return;
  await store
    .setex(key, TTL_SECONDS, JSON.stringify(value))
    .catch(degrade("write"));
}

export async function invalidateCached(
  keys: string[],
  store: IdentityCacheStore | null = getRedis(),
) {
  if (!store || keys.length === 0) return;
  await store.del(...keys).catch(degrade("invalidate"));
}
