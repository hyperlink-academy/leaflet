import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getIdentityData } from "actions/getIdentityData";

export type GetPublicationSubscribersTimeseriesReturnType = Awaited<
  ReturnType<(typeof get_publication_subscribers_timeseries)["handler"]>
>;

export const get_publication_subscribers_timeseries = makeRoute({
  route: "get_publication_subscribers_timeseries",
  input: z.object({
    publication_uri: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
  handler: async (
    { publication_uri, from, to },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    const identity = await getIdentityData();
    if (!identity?.atp_did || !identity.entitlements?.publication_analytics) {
      return { error: "unauthorized" as const };
    }

    // Verify ownership
    const { data: publication } = await supabase
      .from("publications")
      .select("uri, identity_did")
      .eq("uri", publication_uri)
      .single();

    if (!publication || publication.identity_did !== identity.atp_did) {
      return { error: "not_found" as const };
    }

    let query = supabase
      .from("publication_subscriptions")
      .select("created_at")
      .eq("publication", publication_uri)
      .order("created_at", { ascending: true });

    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }

    const { data: subscriptions } = await query;

    // Bucket subscriptions by day and compute cumulative count
    const dailyCounts: Record<string, number> = {};
    for (const sub of subscriptions || []) {
      const day = sub.created_at.slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    const days = Object.keys(dailyCounts).sort();
    let cumulative = 0;

    // If we have a from filter, get the count of subscriptions before that date
    if (from) {
      const { count } = await supabase
        .from("publication_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("publication", publication_uri)
        .lt("created_at", from);
      cumulative = count || 0;
    }

    const timeseries = days.map((day) => {
      cumulative += dailyCounts[day];
      return { day, total_subscribers: cumulative };
    });

    return { result: { timeseries } };
  },
});
