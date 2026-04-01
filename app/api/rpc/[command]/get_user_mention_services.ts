import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getIdentityData } from "actions/getIdentityData";
import type * as MentionConfig from "lexicons/api/types/parts/page/mention/config";
import type * as MentionService from "lexicons/api/types/parts/page/mention/service";

export type GetUserMentionServicesReturnType = Awaited<
  ReturnType<(typeof get_user_mention_services)["handler"]>
>;

export const get_user_mention_services = makeRoute({
  route: "get_user_mention_services",
  input: z.object({}),
  handler: async (_input, { supabase }: Pick<Env, "supabase">) => {
    let user = await getIdentityData();
    if (!user?.atp_did) return { result: { services: [] } };
    const { data: config } = await supabase
      .from("mention_service_configs")
      .select("record")
      .eq("identity_did", user?.atp_did)
      .single();

    const services = (config?.record as MentionConfig.Record)?.services;
    if (!services?.length) return { result: { services: [] } };

    const { data: serviceRows, error } = await supabase
      .from("mention_services")
      .select("uri, record")
      .in("uri", services);

    if (error) {
      throw new Error(`Failed to fetch mention services: ${error.message}`);
    }

    return {
      result: {
        services: (serviceRows || []).map((s) => {
          const record = s.record as MentionService.Record;
          return {
            uri: s.uri,
            name: record.name,
            description: record.description,
            did: record.did,
            canBeScopedToDid: record.canBeScopedToDid ?? false,
          };
        }),
      },
    };
  },
});
