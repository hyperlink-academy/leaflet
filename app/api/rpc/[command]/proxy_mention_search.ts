import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getIdentityData } from "actions/getIdentityData";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient } from "lexicons/api";
import type * as SearchService from "lexicons/api/types/parts/page/mention/search";
import type * as MentionService from "lexicons/api/types/parts/page/mention/service";

export type ProxyMentionSearchReturnType = Awaited<
  ReturnType<(typeof proxy_mention_search)["handler"]>
>;

export const proxy_mention_search = makeRoute({
  route: "proxy_mention_search",
  input: z.object({
    service_uri: z.string(),
    search: z.string(),
  }),
  handler: async (
    { service_uri, search },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    try {
      const identity = await getIdentityData();
      if (!identity?.atp_did) throw new Error("Not authenticated");

      const { data: service } = await supabase
        .from("mention_services")
        .select("record")
        .eq("uri", service_uri)
        .single();

      if (!service) throw new Error("Mention service not found");

      const record = service.record as MentionService.Record;
      const did = record.did;
      if (!did) throw new Error("Service has no DID");

      const sessionResult = await restoreOAuthSession(identity.atp_did);
      if (!sessionResult.ok) throw new Error("OAuth session expired");

      const session = sessionResult.value;
      const agent = new AtpBaseClient(session.fetchHandler.bind(session));
      agent.setHeader("atproto-proxy", `${did}#mention_search`);

      const response = await agent.call("parts.page.mention.search", {
        service: service_uri,
        search,
      });

      const data = response.data as SearchService.OutputSchema | undefined;
      const results: SearchService.Result[] = Array.isArray(data?.results)
        ? data.results
        : [];

      return {
        result: {
          results: results.slice(0, 50).map((r) => ({
            uri: r.uri,
            name: r.name,
            href: r.href,
            icon: r.icon,
            embed: r.embed,
          })),
        },
      };
    } catch (error) {
      console.error("proxy_mention_search failed", {
        service_uri,
        search,
        error,
      });
      throw error;
    }
  },
});
