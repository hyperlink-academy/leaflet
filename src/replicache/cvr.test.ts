import { describe, expect, test } from "vitest";
import type { PatchOperation, ReadonlyJSONValue } from "replicache";
import {
  buildExtras,
  buildPullResponse,
  nextCookieOrder,
  parseCVRCookie,
  stableHash,
  type PullFactRow,
} from "./cvr";
import { makeCVRStore, type CVRStore, type RedisLike } from "./cvrStore";
import { FactWithIndexes } from "./utils";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

// ---------------------------------------------------------------------------
// Simulation helpers: a fake server state, a fake Redis, and a fake client KV
// store, used to check that applying CVR patches always converges to exactly
// the client view the legacy reset strategy would have produced.
// ---------------------------------------------------------------------------

type ServerState = {
  // fact id -> row (row_version emulates xmin: set to the txn counter on
  // every insert/update)
  facts: Map<string, PullFactRow>;
  publication: {
    description: string;
    title: string;
    tags: string[] | null;
    preferences: ReadonlyJSONValue | null;
  } | null;
  draft_contributors: string[];
  clients: Record<string, number>;
  txn: number;
};

function newServerState(): ServerState {
  return {
    facts: new Map(),
    publication: null,
    draft_contributors: [],
    clients: {},
    txn: 1,
  };
}

function pullInputs(s: ServerState) {
  return {
    facts: [...s.facts.values()],
    extras: buildExtras(
      s.publication ? [s.publication] : null,
      s.draft_contributors,
    ),
    clients: { ...s.clients },
  };
}

// What the legacy reset strategy leaves in the client KV: every fact keyed by
// id (with indexes), plus the extra keys.
function naiveClientView(s: ServerState): Map<string, ReadonlyJSONValue> {
  let kv = new Map<string, ReadonlyJSONValue>();
  let { facts, extras } = pullInputs(s);
  for (let [key, value] of Object.entries(extras)) kv.set(key, value);
  for (let { fact } of facts)
    kv.set(fact.id, FactWithIndexes(fact as unknown as Fact<Attribute>));
  return kv;
}

function applyPatch(
  kv: Map<string, ReadonlyJSONValue>,
  patch: readonly PatchOperation[],
) {
  for (let op of patch) {
    if (op.op === "clear") kv.clear();
    else if (op.op === "put") kv.set(op.key, op.value);
    else if (op.op === "del") kv.delete(op.key);
  }
}

function makeFakeRedis() {
  let map = new Map<string, string>();
  let client: RedisLike = {
    async get(key) {
      return map.get(key) ?? null;
    },
    async setex(key, _seconds, value) {
      map.set(key, value);
    },
  };
  return { map, client };
}

let cvrCounter = 0;
// Mirrors computePull's composition: resolve base from the store, build, and
// store the advanced CVR (the real composition is covered by the integration
// tests).
async function serverPull(
  store: CVRStore,
  storeKey: string,
  prevCookie: unknown,
  s: ServerState,
  now: number,
) {
  let cookie = parseCVRCookie(prevCookie);
  let baseCVR = cookie ? await store.get(storeKey, cookie.cvrID) : null;
  let nextCVRID = `cvr-${++cvrCounter}`;
  let { response, nextCVR } = buildPullResponse({
    prevCookie,
    baseCVR,
    nextCVRID,
    ...pullInputs(s),
    now,
  });
  if (nextCVR) await store.set(storeKey, { id: nextCVRID, ...nextCVR });
  return response;
}

let factCounter = 0;
function makeFact(
  s: ServerState,
  data?: { type: string; value: unknown },
): PullFactRow {
  factCounter++;
  let fact = {
    id: `fact-${factCounter}`,
    entity: `entity-${factCounter % 7}`,
    attribute: `attribute/${factCounter % 5}`,
    data: data ?? { type: "text", value: `value ${factCounter}` },
    author_did: null,
    created_at: "2026-01-01T00:00:00",
    updated_at: null,
    version: 0,
  };
  return { fact, row_version: s.txn };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------

describe("parseCVRCookie", () => {
  test("rejects legacy and malformed cookies", () => {
    expect(parseCVRCookie(null)).toBeNull();
    expect(parseCVRCookie(Date.now())).toBeNull();
    expect(parseCVRCookie("some-string")).toBeNull();
    expect(parseCVRCookie({ order: 5 })).toBeNull();
    expect(parseCVRCookie({ order: 5, cvrID: 7 })).toBeNull();
    expect(parseCVRCookie({ order: "5", cvrID: "a" })).toBeNull();
  });

  test("accepts a valid CVR cookie (JSON round-trip safe)", () => {
    let cookie = { order: 12, cvrID: "abc-123" };
    expect(parseCVRCookie(JSON.parse(JSON.stringify(cookie)))).toEqual(cookie);
  });
});

describe("nextCookieOrder", () => {
  test("stays above legacy Date.now() cookies", () => {
    let legacy = 1_752_000_000_000;
    expect(nextCookieOrder(legacy, 1000)).toBe(legacy + 1);
  });
  test("uses wall clock when ahead of the previous order", () => {
    expect(nextCookieOrder(null, 5000)).toBe(5000);
    expect(nextCookieOrder({ order: 10, cvrID: "a" }, 5000)).toBe(5000);
  });
  test("strictly increases even with a stalled clock", () => {
    let cookie = { order: 9000, cvrID: "a" };
    expect(nextCookieOrder(cookie, 9000)).toBe(9001);
    expect(nextCookieOrder(cookie, 100)).toBe(9001);
  });
});

describe("stableHash", () => {
  test("is insensitive to object key order, sensitive to values", () => {
    expect(stableHash({ a: 1, b: [2, { c: 3 }] })).toBe(
      stableHash({ b: [2, { c: 3 }], a: 1 }),
    );
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
    expect(stableHash([])).not.toBe(stableHash(null));
    expect(stableHash("")).not.toBe(stableHash(null));
  });
});

describe("buildPullResponse: reset mode", () => {
  test("matches the legacy reset response shape exactly", () => {
    let s = newServerState();
    s.facts.set("a", {
      fact: {
        id: "a",
        entity: "e1",
        attribute: "attr",
        data: { type: "reference", value: "e2" },
      },
      row_version: 1,
    });
    s.publication = {
      description: "desc",
      title: "title",
      tags: null,
      preferences: null,
    };
    s.clients = { client1: 3 };
    let { response, nextCVR } = buildPullResponse({
      prevCookie: null,
      baseCVR: null,
      nextCVRID: "new-cvr",
      ...pullInputs(s),
      now: 999,
    });
    expect(response.lastMutationIDChanges).toEqual({ client1: 3 });
    expect(response.patch).toEqual([
      { op: "clear" },
      { op: "put", key: "initialized", value: true },
      {
        op: "put",
        key: "a",
        value: {
          id: "a",
          entity: "e1",
          attribute: "attr",
          data: { type: "reference", value: "e2" },
          indexes: { eav: "e1-attr-a", vae: "e2-attr" },
        },
      },
      { op: "put", key: "publication_description", value: "desc" },
      { op: "put", key: "publication_title", value: "title" },
      // legacy behavior: falsy tags/preferences coalesce to []/null
      { op: "put", key: "publication_tags", value: [] },
      { op: "put", key: "post_preferences", value: null },
      { op: "put", key: "draft_contributors", value: [] },
    ]);
    expect(response.cookie).toEqual({ order: 999, cvrID: "new-cvr" });
    expect(nextCVR).not.toBeNull();
    expect(nextCVR!.f).toEqual({ a: 1 });
    expect(nextCVR!.c).toEqual({ client1: 3 });
  });

  test("a parseable cookie whose CVR is gone still gets a full snapshot", () => {
    let s = newServerState();
    let row = makeFact(s);
    s.facts.set(row.fact.id, row);
    let { response } = buildPullResponse({
      prevCookie: { order: 500, cvrID: "evicted" },
      baseCVR: null,
      nextCVRID: "new-cvr",
      ...pullInputs(s),
      now: 100,
    });
    expect(response.patch[0]).toEqual({ op: "clear" });
    expect(response.cookie).toEqual({ order: 501, cvrID: "new-cvr" });
  });

  test("legacy numeric cookies get a reset with a larger order", () => {
    let s = newServerState();
    let legacyCookie = 1_752_000_000_000;
    let { response } = buildPullResponse({
      prevCookie: legacyCookie,
      baseCVR: null,
      nextCVRID: "new-cvr",
      ...pullInputs(s),
      now: 999,
    });
    expect(response.patch[0]).toEqual({ op: "clear" });
    expect((response.cookie as { order: number }).order).toBeGreaterThan(
      legacyCookie,
    );
  });
});

describe("buildPullResponse: diff mode via the store", () => {
  test("no changes → empty patch, cookie echoed, store untouched", async () => {
    let s = newServerState();
    let row = makeFact(s);
    s.facts.set(row.fact.id, row);
    s.clients = { client1: 1 };
    let { map, client } = makeFakeRedis();
    let store = makeCVRStore(client);

    let first = await serverPull(store, "k", null, s, 1000);
    let storedAfterFirst = map.get("replicache-cvr:k");
    let second = await serverPull(
      store,
      "k",
      JSON.parse(JSON.stringify(first.cookie)),
      s,
      2000,
    );
    expect(second.patch).toEqual([]);
    expect(second.lastMutationIDChanges).toEqual({});
    expect(second.cookie).toEqual(JSON.parse(JSON.stringify(first.cookie)));
    expect(map.get("replicache-cvr:k")).toBe(storedAfterFirst);
  });

  test("updated fact → single put; deleted fact → single del", async () => {
    let s = newServerState();
    let a = makeFact(s);
    let b = makeFact(s);
    s.facts.set(a.fact.id, a);
    s.facts.set(b.fact.id, b);
    let store = makeCVRStore(makeFakeRedis().client);
    let first = await serverPull(store, "k", null, s, 1000);

    s.txn++;
    s.facts.set(a.fact.id, {
      fact: { ...a.fact, data: { type: "text", value: "updated" } },
      row_version: s.txn,
    });
    s.facts.delete(b.fact.id);

    let second = await serverPull(store, "k", first.cookie, s, 2000);
    expect(second.patch).toEqual([
      {
        op: "put",
        key: a.fact.id,
        value: FactWithIndexes({
          ...a.fact,
          data: { type: "text", value: "updated" },
        } as unknown as Fact<Attribute>),
      },
      { op: "del", key: b.fact.id },
    ]);
  });

  test("publication appearing and disappearing", async () => {
    let s = newServerState();
    let store = makeCVRStore(makeFakeRedis().client);
    let first = await serverPull(store, "k", null, s, 1000);

    s.publication = {
      description: "d",
      title: "t",
      tags: ["x"],
      preferences: { theme: "dark" },
    };
    let second = await serverPull(store, "k", first.cookie, s, 2000);
    expect(second.patch).toEqual([
      { op: "put", key: "publication_description", value: "d" },
      { op: "put", key: "publication_title", value: "t" },
      { op: "put", key: "publication_tags", value: ["x"] },
      { op: "put", key: "post_preferences", value: { theme: "dark" } },
    ]);

    s.publication = null;
    let third = await serverPull(store, "k", second.cookie, s, 3000);
    expect(third.patch).toEqual(
      expect.arrayContaining([
        { op: "del", key: "publication_description" },
        { op: "del", key: "publication_title" },
        { op: "del", key: "publication_tags" },
        { op: "del", key: "post_preferences" },
      ]),
    );
    expect(third.patch).toHaveLength(4);
  });

  test("lastMutationIDChanges only includes changed clients", async () => {
    let s = newServerState();
    s.clients = { client1: 1, client2: 5 };
    let store = makeCVRStore(makeFakeRedis().client);
    let first = await serverPull(store, "k", null, s, 1000);
    expect(first.lastMutationIDChanges).toEqual({ client1: 1, client2: 5 });

    s.clients = { client1: 4, client2: 5, client3: 1 };
    let second = await serverPull(store, "k", first.cookie, s, 2000);
    expect(second.lastMutationIDChanges).toEqual({ client1: 4, client3: 1 });
    // a mutation-only change still advances the cookie
    expect((second.cookie as { order: number }).order).toBeGreaterThan(
      (first.cookie as { order: number }).order,
    );
  });

  test("a lost pull response forces a clean full resync on the next pull", async () => {
    let s = newServerState();
    let a = makeFact(s);
    s.facts.set(a.fact.id, a);
    let store = makeCVRStore(makeFakeRedis().client);
    let first = await serverPull(store, "k", null, s, 1000);
    let kv = new Map<string, ReadonlyJSONValue>();
    applyPatch(kv, first.patch);

    // second pull advances the store slot, but the response never reaches the
    // client
    s.txn++;
    let b = makeFact(s);
    s.facts.set(b.fact.id, b);
    await serverPull(store, "k", first.cookie, s, 2000);

    // the client retries with its old cookie: slot id no longer matches, so
    // it gets a full snapshot and still converges
    let retry = await serverPull(store, "k", first.cookie, s, 3000);
    expect(retry.patch[0]).toEqual({ op: "clear" });
    applyPatch(kv, retry.patch);
    expect(Object.fromEntries(kv)).toEqual(
      Object.fromEntries(naiveClientView(s)),
    );
  });

  test("editing churn never grows the store: one slot per client group", async () => {
    let s = newServerState();
    let { map, client } = makeFakeRedis();
    let store = makeCVRStore(client);
    let cookie: unknown = null;
    for (let i = 0; i < 20; i++) {
      s.txn++;
      let row = makeFact(s);
      s.facts.set(row.fact.id, row);
      cookie = (await serverPull(store, "k", cookie, s, 1000 + i)).cookie;
    }
    expect(map.size).toBe(1);
  });
});

describe("randomized equivalence with the naive reset strategy", () => {
  // Several simulated clients pull at random cadences — sometimes losing
  // their cookie, sometimes losing a pull response in flight, sometimes
  // having their stored CVR evicted — while the server state mutates; after
  // every applied pull the client's KV must exactly equal the naive full
  // snapshot.
  test.each([1, 2, 3, 4, 5, 6, 7, 8])("seed %i", async (seed) => {
    let rand = mulberry32(seed * 7919);
    let s = newServerState();
    let now = 10_000;
    let { map, client } = makeFakeRedis();
    let store = makeCVRStore(client);
    let clients = [0, 1, 2].map((i) => ({
      storeKey: `group-${i}`,
      cookie: null as unknown,
      kv: new Map<string, ReadonlyJSONValue>(),
      lmids: {} as Record<string, number>,
      initialized: false,
    }));

    for (let step = 0; step < 400; step++) {
      // mutate the server in a fresh "transaction"
      s.txn++;
      let action = rand();
      if (action < 0.35) {
        let row = makeFact(
          s,
          rand() < 0.3
            ? { type: "reference", value: `entity-${Math.floor(rand() * 7)}` }
            : undefined,
        );
        s.facts.set(row.fact.id, row);
      } else if (action < 0.6 && s.facts.size > 0) {
        let ids = [...s.facts.keys()];
        let id = ids[Math.floor(rand() * ids.length)];
        let existing = s.facts.get(id)!;
        s.facts.set(id, {
          fact: {
            ...existing.fact,
            data: { type: "text", value: `updated ${s.txn}` },
          },
          row_version: s.txn,
        });
      } else if (action < 0.75 && s.facts.size > 0) {
        let ids = [...s.facts.keys()];
        s.facts.delete(ids[Math.floor(rand() * ids.length)]);
      } else if (action < 0.85) {
        s.publication =
          rand() < 0.3
            ? null
            : {
                description: `desc ${s.txn}`,
                title: `title ${s.txn}`,
                tags: rand() < 0.5 ? [`tag-${s.txn}`] : null,
                preferences: rand() < 0.5 ? { p: s.txn } : null,
              };
      } else if (action < 0.92) {
        s.draft_contributors =
          rand() < 0.4 ? [] : [`did:plc:${Math.floor(rand() * 3)}`];
      } else {
        let clientID = `client-${Math.floor(rand() * 4)}`;
        s.clients[clientID] = (s.clients[clientID] ?? 0) + 1;
      }

      // some clients pull
      for (let c of clients) {
        if (rand() > 0.3) continue;
        if (rand() < 0.05) {
          // simulate a fresh browser: cookie + kv lost
          c.cookie = null;
          c.kv.clear();
          c.lmids = {};
          c.initialized = false;
        }
        if (rand() < 0.03) map.delete(`replicache-cvr:${c.storeKey}`); // eviction
        now += Math.floor(rand() * 50);
        let res = await serverPull(store, c.storeKey, c.cookie, s, now);

        // simulate a response lost in flight: the server may have advanced
        // its slot but the client saw nothing
        if (rand() < 0.05) continue;

        // cookie order must never decrease
        let prevOrder =
          typeof c.cookie === "number"
            ? c.cookie
            : ((c.cookie as { order?: number })?.order ?? 0);
        let newOrder = (res.cookie as { order: number }).order;
        expect(newOrder).toBeGreaterThanOrEqual(prevOrder);
        if (res.patch.length > 0 && c.initialized)
          expect(newOrder).toBeGreaterThan(prevOrder);

        applyPatch(c.kv, res.patch);
        Object.assign(c.lmids, res.lastMutationIDChanges);
        // round-trip the cookie through JSON like the network would
        c.cookie = JSON.parse(JSON.stringify(res.cookie));
        c.initialized = true;

        // the applied view must equal the naive full snapshot
        expect(Object.fromEntries(c.kv)).toEqual(
          Object.fromEntries(naiveClientView(s)),
        );
        // confirmed mutation ids must match the server exactly for every
        // client the simulated client has ever heard about
        for (let [clientID, lmid] of Object.entries(c.lmids))
          expect(lmid).toBe(s.clients[clientID]);
      }
    }
    // single slot per client group, no accumulation
    expect(map.size).toBeLessThanOrEqual(clients.length);
  });
});
