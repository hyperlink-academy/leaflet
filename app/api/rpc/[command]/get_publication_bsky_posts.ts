import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getIdentityData } from "actions/getIdentityData";
import { tinybird } from "lib/tinybird";
import { AtpAgent, AppBskyFeedDefs } from "@atproto/api";
import { fetchBskyPosts } from "src/utils/fetchBskyPosts";
import { bskyPostUriFromUtmContent } from "src/utils/bskyPostUtm";

export type GetPublicationBskyPostsReturnType = Awaited<
  ReturnType<(typeof get_publication_bsky_posts)["handler"]>
>;

export type PublicationBskyPost = {
  // "<did>/<rkey>" as carried in utm_content; the value to filter analytics by
  ref: string;
  uri: string;
  pageviews: number;
  visitors: number;
  post: AppBskyFeedDefs.PostView | null;
};

// Traffic attributed to individual Bluesky posts (via the utm params set in
// publishPostToBsky), hydrated with each post's current content and
// interaction counts from the public appview.
export const get_publication_bsky_posts = makeRoute({
  route: "get_publication_bsky_posts",
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
    if (
      !identity?.atp_did ||
      !identity.entitlements?.publication_analytics ||
      !identity.entitlements?.pro_plan_visible
    ) {
      return { error: "unauthorized" as const };
    }

    const { data: publication } = await supabase
      .from("publications")
      .select("*, publication_domains(*)")
      .eq("uri", publication_uri)
      .single();

    if (!publication) {
      return { error: "not_found" as const };
    }

    if (publication.identity_did !== identity.atp_did) {
      return { error: "unauthorized" as const };
    }

    const domains = (publication.publication_domains ?? [])
      .map((d) => d.domain)
      .filter(Boolean)
      .join(",");
    if (!domains) {
      return { result: { posts: [] as PublicationBskyPost[] } };
    }

    const trafficResult = await tinybird.publicationBskyTraffic.query({
      domains,
      ...(from ? { date_from: from } : {}),
      ...(to ? { date_to: to } : {}),
      ...(path ? { path } : {}),
    });

    const rows = trafficResult.data
      .map((row) => ({
        ref: row.post_ref,
        uri: bskyPostUriFromUtmContent(row.post_ref),
        pageviews: Number(row.pageviews),
        visitors: Number(row.visitors),
      }))
      .filter((row): row is typeof row & { uri: string } => row.uri !== null);

    // Hydration is best-effort: a public-appview outage still returns the
    // traffic counts, with post: null rendered as an unavailable card.
    let postsByUri: Record<string, AppBskyFeedDefs.PostView> = {};
    if (rows.length > 0) {
      try {
        const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
        const posts = await fetchBskyPosts(
          agent,
          rows.map((r) => r.uri),
        );
        postsByUri = Object.fromEntries(posts.map((p) => [p.uri, p]));
      } catch (e) {
        console.error("[get_publication_bsky_posts] hydration failed:", e);
      }
    }

    const posts: PublicationBskyPost[] = rows.map((row) => ({
      ...row,
      post: postsByUri[row.uri] ?? null,
    }));

    return { result: { posts } };
  },
});
