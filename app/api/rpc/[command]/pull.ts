import { z } from "zod";
import {
  PullRequest,
  PullResponseV1,
  VersionNotSupportedResponse,
} from "replicache";
import type { Fact } from "src/replicache";
import { FactWithIndexes } from "src/replicache/utils";
import type { Attribute } from "src/replicache/attributes";
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
  handler: async ({ pullRequest, token_id }, { supabase }: Env) => {
    let body = pullRequest;
    if (body.pullVersion === 0) return versionNotSupported;
    let { data, error } = await supabase.rpc("pull_data", {
      token_id,
      client_group_id: body.clientGroupID,
    });
    if (!data) {
      console.log(error);

      return {
        error: "ClientStateNotFound",
      } as const;
    }

    let facts = data.facts as {
      attribute: string;
      created_at: string;
      data: any;
      entity: string;
      id: string;
      updated_at: string | null;
      version: number;
    }[];
    let publication_data = data.publications as {
      description: string;
      title: string;
      tags: string[];
      cover_image: string | null;
    }[];
    let pub_patch = publication_data?.[0]
      ? [
          {
            op: "put",
            key: "publication_description",
            value: publication_data[0].description,
          },
          {
            op: "put",
            key: "publication_title",
            value: publication_data[0].title,
          },
          {
            op: "put",
            key: "publication_tags",
            value: publication_data[0].tags || [],
          },
          {
            op: "put",
            key: "publication_cover_image",
            value: publication_data[0].cover_image || null,
          },
        ]
      : [];

    let clientGroup = (
      (data.client_groups as {
        client_id: string;
        client_group: string;
        last_mutation: number;
      }[]) || []
    ).reduce(
      (acc, clientRecord) => {
        acc[clientRecord.client_id] = clientRecord.last_mutation;
        return acc;
      },
      {} as { [clientID: string]: number },
    );

    return {
      cookie: Date.now(),
      lastMutationIDChanges: clientGroup,
      patch: [
        { op: "clear" },
        { op: "put", key: "initialized", value: true },
        ...(facts || []).map((f) => {
          return {
            op: "put",
            key: f.id,
            value: FactWithIndexes(f as unknown as Fact<Attribute>),
          } as const;
        }),
        ...pub_patch,
      ],
    } as PullResponseV1;
  },
});

const versionNotSupported: VersionNotSupportedResponse = {
  error: "VersionNotSupported",
  versionType: "pull",
};
