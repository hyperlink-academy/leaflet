import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClientStateNotFoundResponse,
  PullResponseOKV1,
  ReadonlyJSONValue,
} from "replicache";
import type { Database } from "supabase/database.types";
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

// The whole client view comes from the pull_data_cvr stored function (see its
// migration for the query): one PostgREST round trip, no pool connection, and
// — because the function is a single SQL statement — one snapshot for every
// read, so a mutation's lastMutationID is never visible without its fact
// writes. The caller's base CVR fact versions are passed in so full fact rows
// only leave the database when new or changed against that base; null
// hydrates everything (the full-snapshot path).
export async function fetchPullData(
  supabase: SupabaseClient<Database>,
  token_id: string,
  client_group_id: string,
  baseFactVersions: Record<string, number> | null,
): Promise<PullData> {
  let { data, error } = await supabase.rpc("pull_data_cvr", {
    token_id,
    client_group_id,
    base_cvr: baseFactVersions ?? {},
  });
  if (error || data == null)
    throw error ?? new Error("pull_data_cvr returned no data");
  let result = data as unknown as {
    client_groups: { client_id: string; last_mutation: number }[] | null;
    facts:
      | { id: string; row_version: number; fact: PullFactVersion["fact"] }[]
      | null;
    publications: PullData["publications"];
    draft_contributors: string[] | null;
  };
  let clients: Record<string, number> = {};
  for (let row of result.client_groups ?? [])
    clients[row.client_id] = Number(row.last_mutation);
  return {
    clients,
    facts: (result.facts ?? []).map((row) => ({
      id: row.id,
      row_version: Number(row.row_version),
      fact: row.fact ?? null,
    })),
    publications: result.publications,
    draft_contributors: result.draft_contributors,
  };
}

// The full CVR pull: resolve the base CVR the cookie points at, fetch the
// client view, diff, and store the advanced CVR. Cookies we can't parse
// (legacy Date.now() numbers, null first pulls) and cookies whose CVR is
// gone from the store both get the legacy full-snapshot response.
export async function computePull(
  supabase: SupabaseClient<Database>,
  store: CVRStore,
  pullRequest: { cookie: unknown; clientGroupID: string },
  token_id: string,
  now: number,
): Promise<PullResponseOKV1 | ClientStateNotFoundResponse> {
  let cookie = parseCVRCookie(pullRequest.cookie);
  let storeKey = `${token_id}:${pullRequest.clientGroupID}`;
  try {
    // The base CVR must resolve before the pull query runs: the query takes
    // the base fact versions as an argument and only hydrates rows that
    // differ from them.
    let baseCVR = cookie ? await store.get(storeKey, cookie.cvrID) : null;
    let data = await fetchPullData(
      supabase,
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
