import { inngest } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent } from "@atproto/api";
import { idResolver } from "app/(home-pages)/reader/idResolver";

// 1m, 2m, 4m, 8m, 16m, 32m, 1h, 2h, 4h, 8h, 8h, 8h (~37h total)
const SLEEP_INTERVALS = [
  "1m",
  "2m",
  "4m",
  "8m",
  "16m",
  "32m",
  "1h",
  "2h",
  "4h",
  "8h",
  "8h",
  "8h",
];

export const index_document = inngest.createFunction(
  {
    id: "index_document_v2",
    debounce: {
      key: "event.data.document_uri",
      period: "60s",
      timeout: "3m",
    },
    concurrency: [{ key: "event.data.document_uri", limit: 1 }],
  },
  { event: "appview/index-document" },
  async ({ event, step }) => {
    const { document_uri, document_data, bsky_post_uri, publication, did } =
      event.data;

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

    if (handleResult.isBridgy) {
      return { handle: handleResult.handle, skipped: true };
    }

    await step.run("write-document", async () => {
      const docResult = await supabaseServerClient
        .from("documents")
        .upsert({
          uri: document_uri,
          data: document_data,
          indexed: true,
        });
      if (docResult.error) console.log(docResult.error);

      if (publication) {
        const docInPubResult = await supabaseServerClient
          .from("documents_in_publications")
          .upsert({
            publication,
            document: document_uri,
          });
        await supabaseServerClient
          .from("documents_in_publications")
          .delete()
          .neq("publication", publication)
          .eq("document", document_uri);
        if (docInPubResult.error) console.log(docInPubResult.error);
      }
    });

    if (!bsky_post_uri) {
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
