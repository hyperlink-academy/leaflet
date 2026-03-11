import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getIdentityData } from "actions/getIdentityData";
import { tinybird } from "lib/tinybird";

export type GetPublicationAnalyticsReturnType = Awaited<
  ReturnType<(typeof get_publication_analytics)["handler"]>
>;

export const get_publication_analytics = makeRoute({
  route: "get_publication_analytics",
  input: z.object({
    publication_uri: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
    path: z.string().optional(),
    referrer_host: z.string().optional(),
  }),
  handler: async (
    { publication_uri, from, to, path, referrer_host },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    const identity = await getIdentityData();
    if (
      !identity?.atp_did ||
      !identity.entitlements?.publication_analytics ||
      !identity.entitlements?.pro_plan_visible
    ) {
      return { error: "unauthorized" as const };
    }

    // Verify the user owns this publication
    const { data: publication } = await supabase
      .from("publications")
      .select("*, publication_domains(*)")
      .eq("uri", publication_uri)
      .single();

    if (!publication) {
      return { error: "not_found" as const };
    }

    const domains = (publication.publication_domains ?? [])
      .map((d) => d.domain)
      .filter(Boolean)
      .join(",");
    if (!domains) {
      return {
        result: { traffic: [], topReferrers: [], topPages: [] },
      };
    }

    const [trafficResult, referrersResult, pagesResult] = await Promise.all([
      tinybird.publicationTraffic.query({
        domains,
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
        ...(path ? { path } : {}),
        ...(referrer_host ? { referrer_host } : {}),
      }),
      tinybird.publicationTopReferrers.query({
        domains,
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
        ...(path ? { path } : {}),
        ...(referrer_host ? { referrer_host } : {}),
        limit: 10,
      }),
      tinybird.publicationTopPages.query({
        domains,
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
        ...(referrer_host ? { referrer_host } : {}),
        limit: 20,
      }),
    ]);

    return {
      result: {
        traffic: trafficResult.data,
        topReferrers: referrersResult.data,
        topPages: pagesResult.data,
      },
    };
  },
});
