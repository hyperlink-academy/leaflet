import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getIdentityData } from "actions/getIdentityData";
import type * as MentionConfig from "lexicons/api/types/parts/page/mention/config";
import type * as MentionService from "lexicons/api/types/parts/page/mention/service";

// Naive in-memory cache for user configs (keyed by identity DID)
const configCache = new Map<
  string,
  { services: string[]; expiresAt: number }
>();
// Naive in-memory cache for service records (keyed by URI)
const serviceCache = new Map<
  string,
  { record: MentionService.Record; expiresAt: number }
>();
const CACHE_TTL = 60_000; // 1 minute

export type GetUserMentionServicesReturnType = Awaited<
  ReturnType<(typeof get_user_mention_services)["handler"]>
>;

export const get_user_mention_services = makeRoute({
  route: "get_user_mention_services",
  input: z.object({}),
  handler: async (_input, { supabase }: Pick<Env, "supabase">) => {
    let user = await getIdentityData();
    if (!user?.atp_did) return { result: { services: [] } };
    let services: string[];
    const cachedConfig = configCache.get(user.atp_did);
    if (cachedConfig && Date.now() < cachedConfig.expiresAt) {
      services = cachedConfig.services;
    } else {
      const { data: config } = await supabase
        .from("mention_service_configs")
        .select("record")
        .eq("identity_did", user?.atp_did)
        .single();
      services = (config?.record as MentionConfig.Record)?.services ?? [];
      configCache.set(user.atp_did, {
        services,
        expiresAt: Date.now() + CACHE_TTL,
      });
    }

    if (!services.length) return { result: { services: [] } };

    // Check which URIs we already have cached
    const uncachedUris: string[] = [];
    const cachedRecords: { uri: string; record: MentionService.Record }[] = [];
    for (const uri of services) {
      const cached = serviceCache.get(uri);
      if (cached && Date.now() < cached.expiresAt) {
        cachedRecords.push({ uri, record: cached.record });
      } else {
        uncachedUris.push(uri);
      }
    }

    // Fetch any uncached services from DB
    if (uncachedUris.length > 0) {
      const { data: serviceRows, error } = await supabase
        .from("mention_services")
        .select("uri, record")
        .in("uri", uncachedUris);
      if (error) {
        throw new Error(`Failed to fetch mention services: ${error.message}`);
      }
      for (const s of serviceRows || []) {
        const record = s.record as MentionService.Record;
        serviceCache.set(s.uri, {
          record,
          expiresAt: Date.now() + CACHE_TTL,
        });
        cachedRecords.push({ uri: s.uri, record });
      }
    }

    return {
      result: {
        services: cachedRecords.map((s) => ({
          uri: s.uri,
          name: s.record.name,
          description: s.record.description,
          did: s.record.did,
          canBeScopedToDid: s.record.canBeScopedToDid ?? false,
        })),
      },
    };
  },
});
