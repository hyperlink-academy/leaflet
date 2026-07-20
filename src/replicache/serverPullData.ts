import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  ClientStateNotFoundResponse,
  PullResponseOKV1,
  ReadonlyJSONValue,
} from "replicache";
import { randomUUID } from "node:crypto";
import {
  buildExtras,
  buildPullResponse,
  parseCVRCookie,
  type PullFactVersion,
} from "./cvr";
import type { CVRStore } from "./cvrStore";

export type PullData = {
  clients: Record<string, number>;
  facts: PullFactVersion[];
  publications:
    | {
        description: string;
        title: string;
        tags: string[] | null;
        cover_image: string | null;
        preferences: ReadonlyJSONValue | null;
      }[]
    | null;
  draft_contributors: string[] | null;
};

// Replicates the pull_data Postgres function (and its get_facts closure walk)
// with two additions: each fact carries a row_version taken from xmin, which
// bumps on every insert/update and so lets the CVR pull diff without any
// schema changes; and the caller's base CVR fact versions are passed into the
// query, so full rows only leave the database for facts that are new or
// changed against that base (pass null to hydrate everything, e.g. for a full
// snapshot). Runs as a single repeatable-read snapshot to match the
// consistency of the original single-statement RPC — in particular a
// mutation's lastMutationID is never visible without its fact writes.
export async function fetchPullData(
  db: NodePgDatabase,
  token_id: string,
  client_group_id: string,
  baseFactVersions: Record<string, number> | null,
): Promise<PullData> {
  return await db.transaction(
    async (tx) => {
      let clientRows = (
        await tx.execute(
          sql`SELECT client_id, last_mutation FROM replicache_clients WHERE client_group = ${client_group_id}`,
        )
      ).rows as { client_id: string; last_mutation: number | string }[];
      let clients: Record<string, number> = {};
      for (let row of clientRows)
        clients[row.client_id] = Number(row.last_mutation);

      let factRows = (
        await tx.execute(
          sql`WITH RECURSIVE all_facts AS (
                SELECT f.*, f.xmin::text::bigint AS row_version
                FROM facts f
                JOIN permission_tokens pt ON f.entity = pt.root_entity
                WHERE pt.id = ${token_id}::uuid
              UNION
                SELECT f.*, f.xmin::text::bigint AS row_version
                FROM facts f
                INNER JOIN all_facts f1 ON (uuid(f1.data ->> 'value') = f.entity)
                WHERE f1.data ->> 'type' = 'reference'
                   OR f1.data ->> 'type' = 'ordered-reference'
                   OR f1.data ->> 'type' = 'spatial-reference'
              ),
              base AS (
                SELECT key AS id, value::bigint AS row_version
                FROM jsonb_each_text(${JSON.stringify(baseFactVersions ?? {})}::jsonb)
              )
              SELECT af.id, af.row_version,
                CASE WHEN b.row_version IS NULL OR b.row_version <> af.row_version
                     THEN row_to_json(af)::jsonb - 'row_version'
                END AS fact
              FROM all_facts af
              LEFT JOIN base b ON b.id = af.id::text`,
        )
      ).rows as {
        id: string;
        row_version: number | string;
        fact: NonNullable<PullFactVersion["fact"]> | null;
      }[];
      let facts: PullFactVersion[] = factRows.map((row) => ({
        id: row.id,
        row_version: Number(row.row_version),
        fact: row.fact,
      }));

      let publications = (
        await tx.execute(
          sql`SELECT row_to_json(lip) AS pub FROM leaflets_in_publications lip WHERE lip.leaflet = ${token_id}::uuid`,
        )
      ).rows as { pub: NonNullable<PullData["publications"]>[number] }[];
      if (publications.length === 0)
        publications = (
          await tx.execute(
            sql`SELECT row_to_json(ltd) AS pub FROM leaflets_to_documents ltd WHERE ltd.leaflet = ${token_id}::uuid`,
          )
        ).rows as { pub: NonNullable<PullData["publications"]>[number] }[];

      let contributorRows = (
        await tx.execute(
          sql`SELECT contributor_did FROM leaflet_contributors WHERE leaflet = ${token_id}::uuid`,
        )
      ).rows as { contributor_did: string }[];

      return {
        clients,
        facts,
        publications:
          publications.length > 0 ? publications.map((row) => row.pub) : null,
        draft_contributors:
          contributorRows.length > 0
            ? contributorRows.map((row) => row.contributor_did)
            : null,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// The full CVR pull: resolve the base CVR the cookie points at, fetch the
// client view, diff, and store the advanced CVR. Cookies we can't parse
// (legacy Date.now() numbers, null first pulls) and cookies whose CVR is
// gone from the store both get the legacy full-snapshot response.
export async function computePull(
  db: NodePgDatabase,
  store: CVRStore,
  pullRequest: { cookie: unknown; clientGroupID: string },
  token_id: string,
  now: number,
): Promise<PullResponseOKV1 | ClientStateNotFoundResponse> {
  let cookie = parseCVRCookie(pullRequest.cookie);
  let storeKey = `${token_id}:${pullRequest.clientGroupID}`;
  try {
    // The base CVR must resolve before the snapshot query runs: the query
    // takes the base fact versions as an argument and only hydrates rows
    // that differ from them.
    let baseCVR = cookie ? await store.get(storeKey, cookie.cvrID) : null;
    let data = await fetchPullData(
      db,
      token_id,
      pullRequest.clientGroupID,
      baseCVR?.f ?? null,
    );
    let nextCVRID = randomUUID();
    let { response, nextCVR } = buildPullResponse({
      prevCookie: pullRequest.cookie,
      baseCVR,
      nextCVRID,
      facts: data.facts,
      extras: buildExtras(data.publications, data.draft_contributors),
      clients: data.clients,
      now,
    });
    if (nextCVR) await store.set(storeKey, { id: nextCVRID, ...nextCVR });
    return response;
  } catch (e) {
    // The legacy handler returned ClientStateNotFound whenever the pull_data
    // RPC errored (e.g. a malformed token id); Replicache then resets the
    // client, which also cleanly recovers the (structurally impossible)
    // unhydrated-changed-fact error from buildPullResponse. Preserve that
    // rather than surfacing a 500 the puller would hand to Replicache as a
    // garbage response.
    console.log(e);
    return { error: "ClientStateNotFound" };
  }
}
