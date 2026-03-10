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
    if (!identity?.atp_did || !identity.entitlements?.publication_analytics || !identity.entitlements?.pro_plan_visible) {
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

    // Build timeseries over the full date range, filling gaps with the
    // running cumulative so the chart always has data points to display.
    const timeseries: { day: string; total_subscribers: number }[] = [];
    if (from && to) {
      const cursor = new Date(from);
      cursor.setUTCHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setUTCHours(0, 0, 0, 0);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        cumulative += dailyCounts[key] || 0;
        timeseries.push({ day: key, total_subscribers: cumulative });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      const days = Object.keys(dailyCounts).sort();
      for (const day of days) {
        cumulative += dailyCounts[day];
        timeseries.push({ day, total_subscribers: cumulative });
      }
    }

    return { result: { timeseries } };
  },
});
