import { inngest } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent, AtUri } from "@atproto/api";
import { idResolver } from "app/(home-pages)/reader/idResolver";

// 1m, 2m, 4m, 8m, 16m, 32m, 1h, 2h, 4h, 8h, 8h, 8h (~37h total)
const SLEEP_INTERVALS = [
  "1m", "2m", "4m", "8m", "16m", "32m", "1h", "2h", "4h", "8h", "8h", "8h",
];

export const sync_document_metadata = inngest.createFunction(
  {
    id: "sync_document_metadata_v2",
    debounce: {
      key: "event.data.document_uri",
      period: "60s",
      timeout: "3m",
    },
    concurrency: [{ key: "event.data.document_uri", limit: 1 }],
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
        (s) =>
          typeof s.serviceEndpoint === "string" &&
          s.serviceEndpoint.includes("atproto.brid.gy"),
      );
      return { handle: handle ?? null, isBridgy, doc };
    });
    if (!handleResult) return { error: "No Handle" };

    await step.run("set-indexed", async () => {
      return await supabaseServerClient
        .from("documents")
        .update({ indexed: !handleResult.isBridgy })
        .eq("uri", document_uri)
        .select();
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

    for (let i = 0; i < SLEEP_INTERVALS.length; i++) {
      await step.sleep(`wait-${i + 1}`, SLEEP_INTERVALS[i]);
      likeCount = await step.run(`sync-${i + 1}`, fetchAndUpdate);
    }

    return { likeCount, handle: handleResult.handle };
  },
);
