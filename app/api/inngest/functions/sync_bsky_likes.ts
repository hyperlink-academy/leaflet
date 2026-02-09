import { inngest } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent, AtUri } from "@atproto/api";
import { idResolver } from "app/(home-pages)/reader/idResolver";

const TOTAL_ITERATIONS = 144; // 36 hours at 15-minute intervals

export const sync_bsky_likes = inngest.createFunction(
  {
    id: "sync_bsky_likes",
    idempotency: "event.data.bsky_post_uri",
  },
  { event: "appview/sync-bsky-likes" },
  async ({ event, step }) => {
    const { document_uri, bsky_post_uri } = event.data;

    const isBridgy = await step.run("check-bridgy", async () => {
      const did = new AtUri(bsky_post_uri).host;
      const doc = await idResolver.did.resolve(did);
      const handle = doc?.alsoKnownAs
        ?.find((a) => a.startsWith("at://"))
        ?.replace("at://", "");
      return handle?.includes("brid.gy") ?? false;
    });

    if (isBridgy) {
      return { skipped: true, reason: "brid.gy post" };
    }

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
