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
  }),
  handler: async (
    { publication_uri, from, to, path },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    const identity = await getIdentityData();
    if (!identity?.atp_did || !identity.entitlements?.publication_analytics) {
      return { error: "unauthorized" as const };
    }

    // Verify the user owns this publication
    const { data: publication } = await supabase
      .from("publications")
      .select("*, publication_domains(*)")
      .eq("uri", publication_uri)
      .single();

    if (!publication || publication.identity_did !== identity.atp_did) {
      return { error: "not_found" as const };
    }

    const domain = publication.publication_domains?.[0]?.domain;
    if (!domain) {
      return {
        result: { traffic: [], topReferrers: [], topPages: [] },
      };
    }

    const origin = `https://${domain}/`;

    const [trafficResult, referrersResult, pagesResult] = await Promise.all([
      tinybird.publicationTraffic.query({
        domain: origin,
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
        ...(path ? { path } : {}),
      }),
      tinybird.publicationTopReferrers.query({
        domain: origin,
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
        ...(path ? { path } : {}),
        limit: 10,
      }),
      tinybird.publicationTopPages.query({
        domain: origin,
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
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
