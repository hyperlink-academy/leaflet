import { z } from "zod";
import {
  PullRequest,
  PullResponseV1,
  VersionNotSupportedResponse,
} from "replicache";
import { Database } from "supabase/database.types";
import { Fact } from "src/replicache";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { FactWithIndexes, getClientGroup } from "src/replicache/utils";
import { Attributes } from "src/replicache/attributes";
import { permission_tokens } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { makeRoute } from "../lib";
import { Env } from "./route";

// First define the sub-types for V0 and V1 requests
const pullRequestV0 = z.object({
  pullVersion: z.literal(0),
  schemaVersion: z.string(),
  profileID: z.string(),
  cookie: z.any(), // ReadonlyJSONValue
  clientID: z.string(),
  lastMutationID: z.number(),
});

// For the Cookie type used in V1
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

export const pull = makeRoute({
  route: "pull",
  input: z.object({ pullRequest: PullRequestSchema, token_id: z.string() }),
  handler: async ({ pullRequest, token_id }, { db, supabase }: Env) => {
    let body = pullRequest;
    if (body.pullVersion === 0) return versionNotSupported;
    let [token] = await db
      .select({ root_entity: permission_tokens.root_entity })
      .from(permission_tokens)
      .where(eq(permission_tokens.id, token_id));
    let facts: {
      attribute: string;
      created_at: string;
      data: any;
      entity: string;
      id: string;
      updated_at: string | null;
      version: number;
    }[] = [];
    let clientGroup = {};
    if (token) {
      let { data } = await supabase.rpc("get_facts", {
        root: token.root_entity,
      });

      clientGroup = await getClientGroup(db, body.clientGroupID);
      facts = data || [];
    }

    return {
      cookie: Date.now(),
      lastMutationIDChanges: clientGroup,
      patch: [
        { op: "clear" },
        { op: "put", key: "initialized", value: true },
        ...facts.map((f) => {
          return {
            op: "put",
            key: f.id,
            value: FactWithIndexes(
              f as unknown as Fact<keyof typeof Attributes>,
            ),
          } as const;
        }),
      ],
    } as PullResponseV1;
  },
});

const versionNotSupported: VersionNotSupportedResponse = {
  error: "VersionNotSupported",
  versionType: "pull",
};
