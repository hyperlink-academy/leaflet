import { inngest } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent, AtUri } from "@atproto/api";
import { idResolver } from "app/(home-pages)/reader/idResolver";

const TOTAL_ITERATIONS = 144; // 36 hours at 15-minute intervals

export const sync_document_metadata = inngest.createFunction(
  {
    id: "sync_document_metadata",
    idempotency: "event.data.document_uri",
  },
  { event: "appview/sync-document-metadata" },
  async ({ event, step }) => {
    const { document_uri, bsky_post_uri } = event.data;

    const did = new AtUri(document_uri).host;

    const handleResult = await step.run("resolve-handle", async () => {
      const doc = await idResolver.did.resolve(did);
      const handle = doc?.alsoKnownAs
        ?.find((a) => a.startsWith("at://"))
        ?.replace("at://", "");
      if (!doc) return null;
      const isBridgy = !!doc?.service?.find(
        (s) => s.serviceEndpoint === "https://atproto.brid.gy",
      );
      return { handle: handle ?? null, isBridgy };
    });
    if (!handleResult) return { error: "No Handle" };

    await step.run("set-indexed", async () => {
      await supabaseServerClient
        .from("documents")
        .update({ indexed: !handleResult.isBridgy })
        .eq("uri", document_uri);
    });

    if (!bsky_post_uri || handleResult.isBridgy) {
      return { handle: handleResult.handle };
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

    return { likeCount, handle: handleResult.handle };
  },
);
