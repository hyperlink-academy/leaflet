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

    // Fetch all atproto subscriptions and confirmed email subscriptions in
    // parallel. We dedupe in memory (mirroring PublicationSubscribers.tsx) so
    // we need the full sets — date filtering is applied after.
    const { data: newsletterSettings } = await supabase
      .from("publication_newsletter_settings")
      .select("enabled")
      .eq("publication", publication_uri)
      .maybeSingle();
    const newsletterEnabled = !!newsletterSettings?.enabled;

    const [{ data: atprotoSubs }, { data: emailSubs }] = await Promise.all([
      supabase
        .from("publication_subscriptions")
        .select("created_at, identities(bsky_profiles(did))")
        .eq("publication", publication_uri),
      newsletterEnabled
        ? supabase
            .from("publication_email_subscribers")
            .select("id, created_at, identities(atp_did)")
            .eq("publication", publication_uri)
            .eq("state", "confirmed")
        : Promise.resolve({ data: [] as const }),
    ]);

    // Build dedup map keyed by DID (atproto identity) or email-sub id.
    // Atproto sub's created_at wins when both channels exist for the same DID,
    // matching the UI merge in PublicationSubscribers.tsx.
    const subscribers = new Map<string, string>();
    for (const s of atprotoSubs || []) {
      const did = s.identities?.bsky_profiles?.did;
      if (!did) continue;
      subscribers.set(`did:${did}`, s.created_at);
    }
    for (const s of emailSubs || []) {
      const linkedDid = s.identities?.atp_did ?? undefined;
      if (linkedDid && subscribers.has(`did:${linkedDid}`)) continue;
      subscribers.set(`email:${s.id}`, s.created_at);
    }

    // Bucket the deduped subscribers' creation dates.
    const dailyCounts: Record<string, number> = {};
    let cumulative = 0;
    for (const createdAt of subscribers.values()) {
      if (from && createdAt < from) {
        cumulative += 1;
        continue;
      }
      if (to && createdAt > to) continue;
      const day = createdAt.slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
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
