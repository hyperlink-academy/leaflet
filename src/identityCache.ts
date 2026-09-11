import { createHash } from "node:crypto";
import { getRedis } from "src/redis";

// Deliberately not a "use server" module: exporting an async fn from one would
// publish it as a client-callable endpoint.

const KEY_PREFIX = "identity:v1:";
// 30s is the staleness ceiling for the writers that can't invalidate: Stripe
// and Postmark webhooks change membership and subscription rows without a
// session token, so there's no key for them to delete. Everything that runs
// with the user's cookie calls invalidateIdentityCache instead and is
// immediately consistent.
const TTL_SECONDS = 30;

export type IdentityCacheStore = {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

// The token is hashed because it is a live session credential and Redis keys
// leak through MONITOR, slowlogs and key scans.
export function identityCacheKey(auth_token: string) {
  return KEY_PREFIX + createHash("sha256").update(auth_token).digest("hex");
}

const inFlight = new Map<string, Promise<unknown>>();

export async function getCachedIdentity<T>(
  auth_token: string,
  fetchFresh: () => Promise<T>,
  store: IdentityCacheStore | null = getRedis(),
): Promise<T> {
  if (!store) return fetchFresh();
  const key = identityCacheKey(auth_token);
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = (async () => {
    const cached = await store.get(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // fall through to a fresh read
      }
    }
    const fresh = await fetchFresh();
    await store.setex(key, TTL_SECONDS, JSON.stringify(fresh));
    return fresh;
  })();
  inFlight.set(key, pending);
  try {
    return (await pending) as T;
  } finally {
    inFlight.delete(key);
  }
}

export async function writeCachedIdentity(
  auth_token: string,
  value: unknown,
  store: IdentityCacheStore | null = getRedis(),
) {
  if (!store) return;
  await store.setex(
    identityCacheKey(auth_token),
    TTL_SECONDS,
    JSON.stringify(value),
  );
}

export async function invalidateIdentityCache(
  auth_token: string,
  store: IdentityCacheStore | null = getRedis(),
) {
  if (!store) return;
  await store.del(identityCacheKey(auth_token));
}
