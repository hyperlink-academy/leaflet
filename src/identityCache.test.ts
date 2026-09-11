import { describe, expect, test, vi } from "vitest";
import {
  getCached,
  invalidateCached,
  writeCached,
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
    async del(...keys) {
      for (const key of keys) entries.delete(key);
    },
    advance(seconds) {
      now += seconds;
    },
  };
  return store;
}

describe("identity cache", () => {
  test("misses fetch, hits do not", async () => {
    const store = memoryStore();
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    expect(await getCached("k", fetchFresh, store)).toEqual({ id: 1 });
    expect(await getCached("k", fetchFresh, store)).toEqual({ id: 1 });
    expect(fetchFresh).toHaveBeenCalledTimes(1);
  });

  test("entries expire", async () => {
    const store = memoryStore();
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    await getCached("k", fetchFresh, store);
    store.advance(31);
    await getCached("k", fetchFresh, store);
    expect(fetchFresh).toHaveBeenCalledTimes(2);
  });

  test("concurrent misses share one fetch", async () => {
    const store = memoryStore();
    let release: (v: { id: number }) => void;
    const pending = new Promise<{ id: number }>((r) => (release = r));
    const fetchFresh = vi.fn(() => pending);
    const both = Promise.all([
      getCached("k", fetchFresh, store),
      getCached("k", fetchFresh, store),
    ]);
    release!({ id: 1 });
    expect(await both).toEqual([{ id: 1 }, { id: 1 }]);
    expect(fetchFresh).toHaveBeenCalledTimes(1);
  });

  test("invalidation deletes only the named keys", async () => {
    const store = memoryStore();
    const a = vi.fn(async () => "a");
    const b = vi.fn(async () => "b");
    await getCached("a", a, store);
    await getCached("b", b, store);
    await invalidateCached(["a"], store);
    await getCached("a", a, store);
    await getCached("b", b, store);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
  });

  test("a written value is served to the next read", async () => {
    const store = memoryStore();
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    await writeCached("k", { id: 2 }, store);
    expect(await getCached("k", fetchFresh, store)).toEqual({ id: 2 });
    expect(fetchFresh).not.toHaveBeenCalled();
  });

  test("a failing store degrades to the fresh fetch", async () => {
    const failing: IdentityCacheStore = {
      async get() {
        throw new Error("redis down");
      },
      async setex() {
        throw new Error("redis down");
      },
      async del() {
        throw new Error("redis down");
      },
    };
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    expect(await getCached("k", fetchFresh, failing)).toEqual({ id: 1 });
    await expect(writeCached("k", { id: 1 }, failing)).resolves.toBeUndefined();
    await expect(invalidateCached(["k"], failing)).resolves.toBeUndefined();
  });

  test("without a store every read fetches", async () => {
    const fetchFresh = vi.fn(async () => ({ id: 1 }));
    expect(await getCached("k", fetchFresh, null)).toEqual({ id: 1 });
    expect(await getCached("k", fetchFresh, null)).toEqual({ id: 1 });
    expect(fetchFresh).toHaveBeenCalledTimes(2);
  });
});
