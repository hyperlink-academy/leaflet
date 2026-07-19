import { describe, expect, test } from "vitest";
import { makeCVRStore, type RedisLike } from "./cvrStore";
import type { CVR } from "./cvr";

let cvr: CVR = {
  f: { "fact-1": 4 },
  x: { initialized: "abc" },
  c: { client1: 7 },
};

function mapRedis() {
  let map = new Map<string, string>();
  let ttls = new Map<string, number>();
  let client: RedisLike = {
    async get(key) {
      return map.get(key) ?? null;
    },
    async setex(key, seconds, value) {
      map.set(key, value);
      ttls.set(key, seconds);
    },
  };
  return { map, ttls, client };
}

describe("makeCVRStore", () => {
  test("round-trips a CVR when the cvrID matches", async () => {
    let { ttls, client } = mapRedis();
    let store = makeCVRStore(client);
    await store.set("k", { id: "cvr-1", ...cvr });
    expect(await store.get("k", "cvr-1")).toEqual({ id: "cvr-1", ...cvr });
    // TTL is the GC backstop for abandoned client groups
    expect(ttls.get("replicache-cvr:k")).toBe(60 * 60 * 24 * 30);
  });

  test("misses on unknown key, superseded cvrID, and corrupt data", async () => {
    let { map, client } = mapRedis();
    let store = makeCVRStore(client);
    expect(await store.get("k", "cvr-1")).toBeNull();

    await store.set("k", { id: "cvr-2", ...cvr });
    // a client holding the pre-overwrite cookie gets a miss → full snapshot
    expect(await store.get("k", "cvr-1")).toBeNull();

    map.set("replicache-cvr:k", "{not json");
    expect(await store.get("k", "cvr-2")).toBeNull();
  });

  test("swallows redis errors on both get and set", async () => {
    let store = makeCVRStore({
      async get() {
        throw new Error("redis down");
      },
      async setex() {
        throw new Error("redis down");
      },
    });
    expect(await store.get("k", "cvr-1")).toBeNull();
    await expect(store.set("k", { id: "cvr-1", ...cvr })).resolves.toBeUndefined();
  });

  test("no redis client → always a miss, set is a no-op", async () => {
    let store = makeCVRStore(null);
    await store.set("k", { id: "cvr-1", ...cvr });
    expect(await store.get("k", "cvr-1")).toBeNull();
  });
});
