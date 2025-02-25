import { z } from "zod";
import {
  PatchOperation,
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
import { eq, sql } from "drizzle-orm";
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

type CVR = Array<[string, number]>;
export const pull = makeRoute({
  route: "pull",
  input: z.object({ pullRequest: PullRequestSchema, token_id: z.string() }),
  handler: async ({ pullRequest, token_id }, { supabase }: Env) => {
    const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
    const db = drizzle(client);
    let body = pullRequest;
    if (body.pullVersion === 0) return versionNotSupported;
    let [facts, clientGroup] = await db.transaction(async (tx) => {
      let [token] = await tx
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
        let data = (await tx.execute(
          sql`select * from get_facts(${token.root_entity}) as get_facts`,
        )) as {
          attribute: string;
          created_at: string;
          data: any;
          entity: string;
          id: string;
          updated_at: string | null;
          version: number;
        }[];

        clientGroup = await getClientGroup(tx, body.clientGroupID);
        facts = data || [];
        return [facts, clientGroup];
      }
      return [];
    });
    client.end();
    let oldCvr: CVR = typeof body.cookie === "object" ? body.cookie?.cvr : [];
    let cvr: CVR = (facts || []).map((f) => [f.id, f.version]);
    let patch: PatchOperation[] = [];
    if (!oldCvr) {
      patch.push({ op: "clear" });
      patch.push({ op: "put", key: "initialized", value: true });
    }
    if (oldCvr) {
      let deletions = oldCvr.reduce<{ op: "del"; key: string }[]>((acc, f) => {
        if (!cvr.find((newF) => newF[0] === f[0]))
          acc.push({ op: "del", key: f[0] });
        return acc;
      }, []);
      patch = patch.concat(deletions);
    }

    let puts = (facts || []).reduce<{ op: "put"; key: string; value: any }[]>(
      (acc, f) => {
        let oldFact = oldCvr?.find((oldF) => oldF[0] === f.id);
        if (!oldFact || oldFact[1] < f.version)
          acc.push({
            op: "put",
            key: f.id,
            value: FactWithIndexes(
              f as unknown as Fact<keyof typeof Attributes>,
            ),
          });

        return acc;
      },
      [],
    );
    patch = patch.concat(puts);

    return {
      cookie: { order: Date.now().toString(), cvr },
      lastMutationIDChanges: clientGroup,
      patch,
    } as PullResponseV1;
  },
});

const versionNotSupported: VersionNotSupportedResponse = {
  error: "VersionNotSupported",
  versionType: "pull",
};
