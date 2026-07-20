import { z } from "zod";
import type {
  Cookie,
  PatchOperation,
  PullResponseOKV1,
  ReadonlyJSONValue,
} from "replicache";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { FactWithIndexes } from "src/replicache/utils";

// Row-version (CVR) pull strategy, per
// https://doc.replicache.dev/strategies/row-version. The cookie carries only
// {order, cvrID}; the CVR itself (the previous client view to diff against)
// lives in Redis (src/replicache/cvrStore.ts). Facts are versioned by
// Postgres's xmin system column (only equality is ever compared, so xid
// wraparound is not a concern in practice).

export type PullFact = {
  id: string;
  entity: string;
  attribute: string;
  data: any;
  [key: string]: unknown;
};

export type PullFactVersion = {
  id: string;
  row_version: number;
  // The full row, hydrated by the pull query only for facts that are new or
  // changed relative to the base CVR it was given; null means unchanged.
  fact: PullFact | null;
};

export type CVR = {
  // fact id -> row version (xmin)
  f: Record<string, number>;
  // extra top-level keys (initialized, publication_*, draft_contributors...)
  // -> content hash
  x: Record<string, string>;
  // clientID -> lastMutationID
  c: Record<string, number>;
};

const cvrCookieSchema = z.object({
  order: z.number(),
  cvrID: z.string(),
});

export type CVRCookie = z.infer<typeof cvrCookieSchema>;

// Old clients hold a Date.now() number cookie (or null on first pull); any
// cookie we can't parse gets the legacy full-snapshot response.
export function parseCVRCookie(cookie: unknown): CVRCookie | null {
  let parsed = cvrCookieSchema.safeParse(cookie);
  return parsed.success ? parsed.data : null;
}

// Replicache requires the cookie order to be monotonically increasing within
// a client group. Legacy cookies were Date.now(), so new orders must stay at
// or above wall-clock time to remain larger than any cookie already out there.
export function nextCookieOrder(prevCookie: unknown, now: number): number {
  let prevOrder = 0;
  if (typeof prevCookie === "number") prevOrder = prevCookie;
  else if (
    typeof prevCookie === "object" &&
    prevCookie !== null &&
    typeof (prevCookie as { order?: unknown }).order === "number"
  )
    prevOrder = (prevCookie as { order: number }).order;
  return Math.max(prevOrder + 1, now);
}

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return "[" + value.map(stableStringify).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          stableStringify((value as Record<string, unknown>)[key]),
      )
      .join(",") +
    "}"
  );
}

// Extras have no row in the facts table to take a version from, so they're
// versioned by content hash instead.
export function stableHash(value: unknown): string {
  let s = stableStringify(value);
  return fnv1a(s, 0x811c9dc5).toString(36) + fnv1a(s, 0x9dc5811c).toString(36);
}

// The pull query's hydration condition must mirror the diff below exactly; a
// changed fact arriving unhydrated means the query was given a different base
// CVR than this diff, which is a caller bug — surface it rather than silently
// dropping the update.
function hydrated(row: PullFactVersion): PullFact {
  if (!row.fact)
    throw new Error(
      `fact ${row.id} changed but was not hydrated; the pull query and diff must share the same base CVR`,
    );
  return row.fact;
}

export function buildPullResponse(args: {
  prevCookie: unknown;
  // The stored CVR the cookie's cvrID resolved to; null (legacy cookie, first
  // pull, evicted or lost slot) always yields the full-snapshot response.
  // Must be the same base the pull query hydrated `facts` against.
  baseCVR: CVR | null;
  nextCVRID: string;
  facts: PullFactVersion[];
  // Ordered: `initialized` must be first; later entries keep legacy patch order.
  extras: Record<string, ReadonlyJSONValue>;
  clients: Record<string, number>;
  now: number;
}): {
  response: PullResponseOKV1;
  // The CVR to store under nextCVRID; null when the pull was a no-op and the
  // previous cookie (and stored CVR) remain current.
  nextCVR: CVR | null;
} {
  let { prevCookie, baseCVR: base, nextCVRID, facts, extras, clients, now } =
    args;

  let nextF: Record<string, number> = {};
  for (let { id, row_version } of facts) nextF[id] = row_version;
  let nextX: Record<string, string> = {};
  for (let [key, value] of Object.entries(extras))
    nextX[key] = stableHash(value);
  let nextCVR: CVR = { f: nextF, x: nextX, c: { ...clients } };
  let nextCookie: CVRCookie = {
    order: nextCookieOrder(prevCookie, now),
    cvrID: nextCVRID,
  };

  if (!base) {
    // Legacy full snapshot: identical to the old reset-strategy response,
    // except the cookie now carries the CVR so the next pull can diff.
    let patch: PatchOperation[] = [{ op: "clear" }];
    let extraEntries = Object.entries(extras);
    for (let [key, value] of extraEntries)
      if (key === "initialized") patch.push({ op: "put", key, value });
    for (let row of facts)
      patch.push({
        op: "put",
        key: row.id,
        value: FactWithIndexes(hydrated(row) as unknown as Fact<Attribute>),
      });
    for (let [key, value] of extraEntries)
      if (key !== "initialized") patch.push({ op: "put", key, value });
    return {
      response: {
        cookie: nextCookie as Cookie,
        lastMutationIDChanges: clients,
        patch,
      },
      nextCVR,
    };
  }

  let patch: PatchOperation[] = [];
  for (let row of facts)
    if (base.f[row.id] !== row.row_version)
      patch.push({
        op: "put",
        key: row.id,
        value: FactWithIndexes(hydrated(row) as unknown as Fact<Attribute>),
      });
  for (let id of Object.keys(base.f))
    if (!(id in nextF)) patch.push({ op: "del", key: id });
  for (let [key, value] of Object.entries(extras))
    if (base.x[key] !== nextX[key]) patch.push({ op: "put", key, value });
  for (let key of Object.keys(base.x))
    if (!(key in nextX)) patch.push({ op: "del", key });

  let lastMutationIDChanges: Record<string, number> = {};
  for (let [clientID, lmid] of Object.entries(clients))
    if (base.c[clientID] !== lmid) lastMutationIDChanges[clientID] = lmid;

  // Nothing changed: echo the cookie back unchanged so the client commits
  // nothing. This is the common poll case and now costs ~zero bandwidth.
  if (patch.length === 0 && Object.keys(lastMutationIDChanges).length === 0)
    return {
      response: {
        cookie: prevCookie as Cookie,
        lastMutationIDChanges: {},
        patch: [],
      },
      nextCVR: null,
    };

  return {
    response: { cookie: nextCookie as Cookie, lastMutationIDChanges, patch },
    nextCVR,
  };
}

// Builds the non-fact keys of the client view. Mirrors the legacy pull
// handler's handling of pull_data's publications + draft_contributors
// payloads, including its falsy-coalescing of tags/preferences.
export function buildExtras(
  publication_data:
    | {
        description: string;
        title: string;
        tags: string[] | null;
        preferences: ReadonlyJSONValue | null;
      }[]
    | null,
  draft_contributors: string[] | null,
): Record<string, ReadonlyJSONValue> {
  let extras: Record<string, ReadonlyJSONValue> = { initialized: true };
  let pub = publication_data?.[0];
  if (pub) {
    extras.publication_description = pub.description;
    extras.publication_title = pub.title;
    extras.publication_tags = pub.tags || [];
    extras.post_preferences = pub.preferences || null;
  }
  extras.draft_contributors = draft_contributors ?? [];
  return extras;
}
