import { inngest } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent } from "@atproto/api";

const TOTAL_ITERATIONS = 144; // 36 hours at 15-minute intervals

export const sync_bsky_likes = inngest.createFunction(
  {
    id: "sync_bsky_likes",
    idempotency: "event.data.bsky_post_uri",
  },
  { event: "appview/sync-bsky-likes" },
  async ({ event, step }) => {
    const { document_uri, bsky_post_uri } = event.data;

    const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

    const fetchAndUpdate = async () => {
      const res = await agent.app.bsky.feed.getPosts({
        uris: [bsky_post_uri],
      });
      const post = res.data.posts[0];
      if (!post) return 0;
      const likeCount = post.likeCount ?? 0;
      await supabaseServerClient
        .from("documents")
        .update({ bsky_like_count: likeCount })
        .eq("uri", document_uri);
      return likeCount;
    };

    let likeCount = await step.run("sync-0", fetchAndUpdate);

    for (let i = 1; i < TOTAL_ITERATIONS; i++) {
      await step.sleep(`wait-${i}`, "15m");
      likeCount = await step.run(`sync-${i}`, fetchAndUpdate);
    }

    return { likeCount };
  },
);
