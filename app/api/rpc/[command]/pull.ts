import { z } from "zod";
import { VersionNotSupportedResponse } from "replicache";
import { drizzle } from "drizzle-orm/node-postgres";
import Client from "ioredis";
import { pool } from "supabase/pool";
import { computePull } from "src/replicache/serverPullData";
import { makeCVRStore } from "src/replicache/cvrStore";
import { makeRoute } from "../lib";
import type { Env } from "./route";

// First define the sub-types for V0 and V1 requests
const pullRequestV0 = z.object({
  pullVersion: z.literal(0),
  schemaVersion: z.string(),
  profileID: z.string(),
  cookie: z.any(), // ReadonlyJSONValue
  clientID: z.string(),
  lastMutationID: z.number(),
});

// For the Cookie type used in V1. New clients hold a CVR cookie (an object
// with an order property); pre-CVR clients hold a Date.now() number, which
// computePull answers with a full snapshot.
const cookieType = z.union([
  z.null(),
  z.string(),
  z.number(),
  z
    .object({
      order: z.union([z.string(), z.number()]),
    })
    .and(z.record(z.string(), z.any())), // ReadonlyJSONValue with order property
]);

const pullRequestV1 = z.object({
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  cookie: cookieType,
  clientGroupID: z.string(),
});

// Combined PullRequest type
const PullRequestSchema = z.union([pullRequestV0, pullRequestV1]);

const db = drizzle(pool);
// Without Redis (dev) every CVR lookup misses and pulls degrade to full
// snapshots — the pre-CVR behavior.
const cvrStore = makeCVRStore(
  process.env.NODE_ENV === "production" && process.env.REDIS_URL
    ? new Client(process.env.REDIS_URL)
    : null,
);

export const pull = makeRoute({
  route: "pull",
  input: z.object({ pullRequest: PullRequestSchema, token_id: z.string() }),
  handler: async ({ pullRequest, token_id }, _env: Env) => {
    let body = pullRequest;
    if (body.pullVersion === 0) return versionNotSupported;
    return await computePull(db, cvrStore, body, token_id, Date.now());
  },
});

const versionNotSupported: VersionNotSupportedResponse = {
  error: "VersionNotSupported",
  versionType: "pull",
};
