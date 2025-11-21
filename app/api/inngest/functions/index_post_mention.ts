import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { AtpAgent, AtUri } from "@atproto/api";
import { Json } from "supabase/database.types";
import { ids } from "lexicons/api/lexicons";
import { Notification, pingIdentityToUpdateNotification } from "src/notifications";
import { v7 } from "uuid";

export const index_post_mention = inngest.createFunction(
  { id: "index_post_mention" },
  { event: "appview/index-bsky-post-mention" },
  async ({ event, step }) => {
    let url = new URL(event.data.document_link);
    let path = url.pathname.split("/").filter(Boolean);

    let { data: pub, error } = await supabaseServerClient
      .from("publications")
      .select("*")
      .eq("record->>base_path", url.host)
      .single();

    if (!pub) {
      return {
        message: `No publication found for ${url.host}/${path[0]}`,
        error,
      };
    }

    let bsky_post = await step.run("get-bsky-post-data", async () => {
      let agent = new AtpAgent({ service: "https://public.api.bsky.app" });
      let posts = await agent.app.bsky.feed.getPosts({
        uris: [event.data.post_uri],
      });
      if (!posts.data.posts[0]) return null;
      return posts.data.posts[0];
    });

    if (!bsky_post) {
      return { message: `No post found for ${event.data.post_uri}` };
    }

    const documentUri = AtUri.make(
      pub.identity_did,
      ids.PubLeafletDocument,
      path[0],
    ).toString();

    await step.run("index-bsky-post", async () => {
      await supabaseServerClient.from("bsky_posts").insert({
        uri: bsky_post.uri,
        cid: bsky_post.cid,
        post_view: bsky_post as Json,
      });
      await supabaseServerClient.from("document_mentions_in_bsky").insert({
        uri: bsky_post.uri,
        document: documentUri,
        link: event.data.document_link,
      });
    });

    await step.run("create-notification", async () => {
      // Only create notification if the quote is from someone other than the author
      if (bsky_post.author.did !== pub.identity_did) {
        const notification: Notification = {
          id: v7(),
          recipient: pub.identity_did,
          data: {
            type: "quote",
            bsky_post_uri: bsky_post.uri,
            document_uri: documentUri,
          },
        };
        await supabaseServerClient.from("notifications").insert(notification);
        await pingIdentityToUpdateNotification(pub.identity_did);
      }
    });
  },
);
