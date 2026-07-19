import { afterAll, describe, expect, test } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import type { PatchOperation, ReadonlyJSONValue } from "replicache";
import { fetchPullData, computePull } from "./serverPullData";
import { parseCVRCookie } from "./cvr";
import { makeCVRStore, type RedisLike } from "./cvrStore";

// computePull is exercised with the real store logic over a Map-backed fake
// redis; only the ioredis transport itself is out of scope here.
let redisMap = new Map<string, string>();
let fakeRedis: RedisLike = {
  async get(key) {
    return redisMap.get(key) ?? null;
  },
  async setex(key, _seconds, value) {
    redisMap.set(key, value);
  },
};
let store = makeCVRStore(fakeRedis);

// These tests run against the local supabase database (which must be migrated
// and running: `supabase start`). They never read .env.local so they can't
// accidentally point at production.
const TEST_DB_URL =
  process.env.TEST_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let pool = new Pool({ connectionString: TEST_DB_URL, max: 5 });
let db = drizzle(pool);

let dbAvailable = await pool
  .query("select 1 from pg_proc where proname = 'pull_data'")
  .then((r) => r.rowCount === 1)
  .catch(() => false);
if (!dbAvailable)
  console.warn(
    `Skipping pull integration tests: no migrated database at ${TEST_DB_URL}`,
  );

// ---------------------------------------------------------------------------
// Seeding helpers. Cleanup relies on ON DELETE CASCADE from entity_sets for
// everything except documents and replicache_clients, which we track.
// ---------------------------------------------------------------------------

let createdEntitySets: string[] = [];
let createdDocuments: string[] = [];
let createdClients: string[] = [];

async function createDoc() {
  let set = randomUUID();
  let root = randomUUID();
  let token = randomUUID();
  createdEntitySets.push(set);
  await pool.query(`insert into entity_sets (id) values ($1)`, [set]);
  await pool.query(`insert into entities (id, set) values ($1, $2)`, [
    root,
    set,
  ]);
  await pool.query(
    `insert into permission_tokens (id, root_entity) values ($1, $2)`,
    [token, root],
  );
  return { set, root, token };
}

async function addEntity(set: string) {
  let id = randomUUID();
  await pool.query(`insert into entities (id, set) values ($1, $2)`, [id, set]);
  return id;
}

async function addFact(entity: string, attribute: string, data: unknown) {
  let id = randomUUID();
  await pool.query(
    `insert into facts (id, entity, attribute, data) values ($1, $2, $3, $4)`,
    [id, entity, attribute, JSON.stringify(data)],
  );
  return id;
}

async function setClient(
  client_id: string,
  client_group: string,
  last_mutation: number,
) {
  createdClients.push(client_id);
  await pool.query(
    `insert into replicache_clients (client_id, client_group, last_mutation)
     values ($1, $2, $3)
     on conflict (client_id) do update set last_mutation = excluded.last_mutation`,
    [client_id, client_group, last_mutation],
  );
}

async function addPublicationFor(token: string, title: string) {
  let did = `did:plc:test-${randomUUID().slice(0, 13)}`;
  let uri = `at://${did}/pub.leaflet.publication/test`;
  await pool.query(
    `insert into identities (id, home_page, atp_did) values ($1, $2, $3)`,
    [randomUUID(), token, did],
  );
  await pool.query(
    `insert into publications (uri, name, identity_did) values ($1, $2, $3)`,
    [uri, "Test Publication", did],
  );
  await pool.query(
    `insert into leaflets_in_publications (publication, leaflet, doc, title, description, tags, preferences)
     values ($1, $2, null, $3, 'a description', $4, $5)`,
    [uri, token, title, ["tag1", "tag2"], JSON.stringify({ theme: "dark" })],
  );
  return { did, uri };
}

function sortById<T extends { id: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

async function naivePullData(token: string, clientGroup: string) {
  let { rows } = await pool.query(
    `select * from pull_data($1::uuid, $2)`,
    [token, clientGroup],
  );
  return rows[0] as {
    client_groups:
      | { client_id: string; client_group: string; last_mutation: number }[]
      | null;
    facts: { id: string; [k: string]: unknown }[] | null;
    publications: Record<string, unknown>[] | null;
    draft_contributors: string[] | null;
  };
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

afterAll(async () => {
  if (dbAvailable) {
    if (createdEntitySets.length)
      await pool.query(`delete from entity_sets where id = any($1)`, [
        createdEntitySets,
      ]);
    if (createdDocuments.length)
      await pool.query(`delete from documents where uri = any($1)`, [
        createdDocuments,
      ]);
    if (createdClients.length)
      await pool.query(`delete from replicache_clients where client_id = any($1)`, [
        createdClients,
      ]);
  }
  await pool.end();
});

// ---------------------------------------------------------------------------

describe.runIf(dbAvailable)("fetchPullData parity with pull_data RPC", () => {
  test("fact closure, clients, publication and contributors all match", async () => {
    let { set, root, token } = await createDoc();
    let child = await addEntity(set);
    let grandchild = await addEntity(set);
    let orphan = await addEntity(set);

    await addFact(root, "block/text", { type: "text", value: "hello world" });
    await addFact(root, "card/block", {
      type: "ordered-reference",
      value: child,
      position: "a0",
    });
    await addFact(child, "card/block", {
      type: "reference",
      value: grandchild,
    });
    await addFact(grandchild, "canvas/block", {
      type: "spatial-reference",
      value: root, // cycle back to the root
      position: { x: 0, y: 0 },
    });
    // orphan is not reachable from root and must not appear
    await addFact(orphan, "block/text", { type: "text", value: "orphan" });

    let clientGroup = `cg-${randomUUID()}`;
    await setClient(`c1-${randomUUID()}`, clientGroup, 4);
    await setClient(`c2-${randomUUID()}`, clientGroup, 9);
    await addPublicationFor(token, "Pub Title");
    await pool.query(
      `insert into leaflet_contributors (leaflet, contributor_did)
       select $1, atp_did from identities where home_page = $1`,
      [token],
    );

    let naive = await naivePullData(token, clientGroup);
    let mine = await fetchPullData(db, token, clientGroup);

    // facts: same rows, same JSON shapes
    expect(sortById(mine.facts.map((f) => f.fact))).toEqual(
      sortById(naive.facts ?? []),
    );
    expect(mine.facts).toHaveLength(4);
    for (let f of mine.facts) {
      expect(typeof f.row_version).toBe("number");
      expect(f.row_version).toBeGreaterThan(0);
    }

    // clients
    let naiveClients: Record<string, number> = {};
    for (let c of naive.client_groups ?? [])
      naiveClients[c.client_id] = c.last_mutation;
    expect(mine.clients).toEqual(naiveClients);

    // publications + contributors
    expect(mine.publications).toEqual(naive.publications);
    expect(mine.publications?.[0]?.title).toBe("Pub Title");
    expect(mine.draft_contributors).toEqual(naive.draft_contributors);
    expect(mine.draft_contributors).toHaveLength(1);
  });

  test("empty/nonexistent cases match", async () => {
    // token that exists but has no facts beyond nothing on the root
    let { token } = await createDoc();
    let naive = await naivePullData(token, "no-such-group");
    let mine = await fetchPullData(db, token, "no-such-group");
    expect(mine.facts.map((f) => f.fact)).toEqual(naive.facts ?? []);
    expect(mine.clients).toEqual({});
    expect(mine.publications).toEqual(naive.publications);
    expect(mine.draft_contributors).toEqual(naive.draft_contributors);

    // valid-uuid but nonexistent token
    let ghost = randomUUID();
    let naiveGhost = await naivePullData(ghost, "no-such-group");
    let mineGhost = await fetchPullData(db, ghost, "no-such-group");
    expect(mineGhost.facts).toEqual([]);
    expect(naiveGhost.facts).toBeNull();
    expect(mineGhost.publications).toBeNull();
    expect(mineGhost.draft_contributors).toBeNull();

    // malformed token id errors in both
    await expect(naivePullData("not-a-uuid", "g")).rejects.toThrow();
    await expect(fetchPullData(db, "not-a-uuid", "g")).rejects.toThrow();
  });

  test("row_version tracks updates via xmin", async () => {
    let { root, token } = await createDoc();
    let factA = await addFact(root, "block/text", {
      type: "text",
      value: "a",
    });
    let factB = await addFact(root, "block/text", {
      type: "text",
      value: "b",
    });

    let before = await fetchPullData(db, token, "g");
    let beforeA = before.facts.find((f) => f.fact.id === factA)!;
    let beforeB = before.facts.find((f) => f.fact.id === factB)!;

    await pool.query(`update facts set data = $2 where id = $1`, [
      factA,
      JSON.stringify({ type: "text", value: "a2" }),
    ]);

    let after = await fetchPullData(db, token, "g");
    let afterA = after.facts.find((f) => f.fact.id === factA)!;
    let afterB = after.facts.find((f) => f.fact.id === factB)!;

    expect(afterA.row_version).not.toBe(beforeA.row_version);
    expect(afterA.fact.data).toEqual({ type: "text", value: "a2" });
    expect(afterB.row_version).toBe(beforeB.row_version);
  });
});

describe.runIf(dbAvailable)("computePull end-to-end", () => {
  test("first pull resets, later pulls are incremental, no-op pulls are free", async () => {
    let { set, root, token } = await createDoc();
    let child = await addEntity(set);
    let factRoot = await addFact(root, "card/block", {
      type: "reference",
      value: child,
    });
    let factChild = await addFact(child, "block/text", {
      type: "text",
      value: "original",
    });
    let clientGroup = `cg-${randomUUID()}`;
    let clientID = `c-${randomUUID()}`;
    await setClient(clientID, clientGroup, 1);

    // --- first pull: legacy-style full snapshot
    let kv = new Map<string, ReadonlyJSONValue>();
    let first = await computePull(
      db,
      store,
      { cookie: null, clientGroupID: clientGroup },
      token,
      Date.now(),
    );
    if ("error" in first) throw new Error("unexpected pull error");
    expect(first.patch[0]).toEqual({ op: "clear" });
    expect(first.lastMutationIDChanges).toEqual({ [clientID]: 1 });
    applyPatch(kv, first.patch);
    expect(kv.get("initialized")).toBe(true);
    expect(kv.has(factRoot)).toBe(true);
    expect(kv.has(factChild)).toBe(true);
    expect(parseCVRCookie(first.cookie)).not.toBeNull();
    let slotKey = `replicache-cvr:${token}:${clientGroup}`;
    expect(JSON.parse(redisMap.get(slotKey)!).id).toBe(
      parseCVRCookie(first.cookie)!.cvrID,
    );

    // --- no-op pull: nothing changed
    let noop = await computePull(
      db,
      store,
      { cookie: JSON.parse(JSON.stringify(first.cookie)), clientGroupID: clientGroup },
      token,
      Date.now(),
    );
    if ("error" in noop) throw new Error("unexpected pull error");
    expect(noop.patch).toEqual([]);
    expect(noop.lastMutationIDChanges).toEqual({});
    expect(noop.cookie).toEqual(JSON.parse(JSON.stringify(first.cookie)));
    // a no-op pull writes nothing: the slot still holds the first CVR
    expect(JSON.parse(redisMap.get(slotKey)!).id).toBe(
      parseCVRCookie(first.cookie)!.cvrID,
    );

    // --- mutate: update one fact, add one, delete none, confirm a mutation
    await pool.query(`update facts set data = $2 where id = $1`, [
      factChild,
      JSON.stringify({ type: "text", value: "edited" }),
    ]);
    let factNew = await addFact(child, "block/heading", {
      type: "number",
      value: 2,
    });
    await setClient(clientID, clientGroup, 2);

    let second = await computePull(
      db,
      store,
      { cookie: noop.cookie, clientGroupID: clientGroup },
      token,
      Date.now(),
    );
    if ("error" in second) throw new Error("unexpected pull error");
    // incremental: no clear, and only the two touched facts
    expect(second.patch.some((op) => op.op === "clear")).toBe(false);
    expect(
      second.patch.map((op) => ({ op: op.op, key: "key" in op ? op.key : "" })),
    ).toEqual(
      expect.arrayContaining([
        { op: "put", key: factChild },
        { op: "put", key: factNew },
      ]),
    );
    expect(second.patch).toHaveLength(2);
    expect(second.lastMutationIDChanges).toEqual({ [clientID]: 2 });
    applyPatch(kv, second.patch);

    // --- delete a fact (which unlinks the child closure too)
    await pool.query(`delete from facts where id = $1`, [factRoot]);
    let third = await computePull(
      db,
      store,
      { cookie: second.cookie, clientGroupID: clientGroup },
      token,
      Date.now(),
    );
    if ("error" in third) throw new Error("unexpected pull error");
    // deleting the reference fact removes the whole child subtree from the view
    expect(new Set(third.patch.map((op) => op.op))).toEqual(new Set(["del"]));
    expect(new Set(third.patch.map((op) => ("key" in op ? op.key : "")))).toEqual(
      new Set([factRoot, factChild, factNew]),
    );
    applyPatch(kv, third.patch);

    // final client view must equal a from-scratch snapshot
    let fresh = await computePull(
      db,
      store,
      { cookie: null, clientGroupID: clientGroup },
      token,
      Date.now(),
    );
    if ("error" in fresh) throw new Error("unexpected pull error");
    let freshKv = new Map<string, ReadonlyJSONValue>();
    applyPatch(freshKv, fresh.patch);
    expect(Object.fromEntries(kv)).toEqual(Object.fromEntries(freshKv));
  });

  test("publication metadata changes flow through incrementally", async () => {
    let { token } = await createDoc();
    let first = await computePull(
      db,
      store,
      { cookie: null, clientGroupID: "g" },
      token,
      Date.now(),
    );
    if ("error" in first) throw new Error("unexpected pull error");
    let kv = new Map<string, ReadonlyJSONValue>();
    applyPatch(kv, first.patch);
    expect(kv.has("publication_title")).toBe(false);

    await addPublicationFor(token, "First Title");
    let second = await computePull(
      db,
      store,
      { cookie: first.cookie, clientGroupID: "g" },
      token,
      Date.now(),
    );
    if ("error" in second) throw new Error("unexpected pull error");
    applyPatch(kv, second.patch);
    expect(kv.get("publication_title")).toBe("First Title");
    expect(kv.get("publication_tags")).toEqual(["tag1", "tag2"]);
    expect(kv.get("post_preferences")).toEqual({ theme: "dark" });
    expect(kv.get("draft_contributors")).toEqual([]);

    await pool.query(
      `update leaflets_in_publications set title = 'Renamed' where leaflet = $1`,
      [token],
    );
    let third = await computePull(
      db,
      store,
      { cookie: second.cookie, clientGroupID: "g" },
      token,
      Date.now(),
    );
    if ("error" in third) throw new Error("unexpected pull error");
    expect(third.patch).toEqual([
      { op: "put", key: "publication_title", value: "Renamed" },
    ]);
  });

  test("legacy numeric cookie falls back to a full snapshot with a larger order", async () => {
    let { root, token } = await createDoc();
    await addFact(root, "block/text", { type: "text", value: "hi" });
    let legacyCookie = Date.now() - 1000;
    let res = await computePull(
      db,
      store,
      { cookie: legacyCookie, clientGroupID: "g" },
      token,
      Date.now(),
    );
    if ("error" in res) throw new Error("unexpected pull error");
    expect(res.patch[0]).toEqual({ op: "clear" });
    expect((res.cookie as { order: number }).order).toBeGreaterThan(
      legacyCookie,
    );
    expect(parseCVRCookie(res.cookie)).not.toBeNull();
  });

  test("an evicted CVR slot falls back to a full snapshot and re-converges", async () => {
    let { root, token } = await createDoc();
    await addFact(root, "block/text", { type: "text", value: "hi" });
    let first = await computePull(
      db,
      store,
      { cookie: null, clientGroupID: "g" },
      token,
      Date.now(),
    );
    if ("error" in first) throw new Error("unexpected pull error");
    let slotKey = `replicache-cvr:${token}:g`;
    redisMap.delete(slotKey);

    let res = await computePull(
      db,
      store,
      { cookie: first.cookie, clientGroupID: "g" },
      token,
      Date.now(),
    );
    if ("error" in res) throw new Error("unexpected pull error");
    expect(res.patch[0]).toEqual({ op: "clear" });
    // a fresh slot was written for the new cookie
    expect(JSON.parse(redisMap.get(slotKey)!).id).toBe(
      parseCVRCookie(res.cookie)!.cvrID,
    );
  });

  test("malformed token id returns ClientStateNotFound like the legacy handler", async () => {
    let res = await computePull(
      db,
      store,
      { cookie: null, clientGroupID: "g" },
      "not-a-uuid",
      Date.now(),
    );
    expect(res).toEqual({ error: "ClientStateNotFound" });
  });
});
