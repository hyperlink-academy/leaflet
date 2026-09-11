import { describe, expect, test, vi } from "vitest";
import {
  getCachedIdentity,
  identityCacheKey,
  invalidateIdentityCache,
  writeCachedIdentity,
  type IdentityCacheStore,
} from "./identityCache";

function memoryStore() {
  let now = 0;
  const entries = new Map<string, { value: string; expiresAt: number }>();
  const store: IdentityCacheStore & { advance(seconds: number): void } = {
    async get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    async setex(key, seconds, value) {
      entries.set(key, { value, expiresAt: now + seconds });
    },
    async del(key) {
      entries.delete(key);
    },
    advance(seconds) {
      now += seconds;
    },
  };
  return store;
}

describe("identity cache", () => {
  test("keys never contain the raw token", () => {
    expect(identityCacheKey("a-token")).not.toContain("a-token");
    expect(identityCacheKey("a-token")).toEqual(identityCacheKey("a-token"));
    expect(identityCacheKey("a-token")).not.toEqual(
      identityCacheKey("b-token"),
    );
  });

  test("misses fetch, hits do not", async () => {
    const store = memoryStore();
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    expect(await getCachedIdentity("t", fetchFresh, store)).toEqual({ id: 1 });
    expect(await getCachedIdentity("t", fetchFresh, store)).toEqual({ id: 1 });
    expect(fetchFresh).toHaveBeenCalledTimes(1);
  });

  test("entries expire", async () => {
    const store = memoryStore();
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    await getCachedIdentity("t", fetchFresh, store);
    store.advance(31);
    await getCachedIdentity("t", fetchFresh, store);
    expect(fetchFresh).toHaveBeenCalledTimes(2);
  });

  test("concurrent misses share one fetch", async () => {
    const store = memoryStore();
    let release: (v: { id: number }) => void;
    const pending = new Promise<{ id: number }>((r) => (release = r));
    const fetchFresh = vi.fn(() => pending);
    const both = Promise.all([
      getCachedIdentity("t", fetchFresh, store),
      getCachedIdentity("t", fetchFresh, store),
    ]);
    release!({ id: 1 });
    expect(await both).toEqual([{ id: 1 }, { id: 1 }]);
    expect(fetchFresh).toHaveBeenCalledTimes(1);
  });

  test("invalidation forces the next read to fetch", async () => {
    const store = memoryStore();
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    await getCachedIdentity("t", fetchFresh, store);
    await invalidateIdentityCache("t", store);
    await getCachedIdentity("t", fetchFresh, store);
    expect(fetchFresh).toHaveBeenCalledTimes(2);
  });

  test("a written value is served to the next read", async () => {
    const store = memoryStore();
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    await writeCachedIdentity("t", { id: 2 }, store);
    expect(await getCachedIdentity("t", fetchFresh, store)).toEqual({ id: 2 });
    expect(fetchFresh).not.toHaveBeenCalled();
  });

  test("without a store every read fetches", async () => {
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    expect(await getCachedIdentity("t", fetchFresh, null)).toEqual({ id: 1 });
    expect(await getCachedIdentity("t", fetchFresh, null)).toEqual({ id: 1 });
    expect(fetchFresh).toHaveBeenCalledTimes(2);
  });
});
