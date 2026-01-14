import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { AtpAgent, AtUri } from "@atproto/api";
import { Json } from "supabase/database.types";
import { ids } from "lexicons/api/lexicons";
import { Notification, pingIdentityToUpdateNotification } from "src/notifications";
import { v7 } from "uuid";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import { documentUriFilter } from "src/utils/uriHelpers";

export const index_post_mention = inngest.createFunction(
  { id: "index_post_mention" },
  { event: "appview/index-bsky-post-mention" },
  async ({ event, step }) => {
    let url = new URL(event.data.document_link);
    let path = url.pathname.split("/").filter(Boolean);

    // Check if this is a standalone document URL (/p/didOrHandle/rkey/...)
    const isStandaloneDoc = path[0] === "p" && path.length >= 3;

    let documentUri: string;
    let authorDid: string;

    if (isStandaloneDoc) {
      // Standalone doc: /p/didOrHandle/rkey/l-quote/...
      const didOrHandle = decodeURIComponent(path[1]);
      const rkey = path[2];

      // Resolve handle to DID if necessary
      let did = didOrHandle;
      if (!didOrHandle.startsWith("did:")) {
        const resolved = await step.run("resolve-handle", async () => {
          return idResolver.handle.resolve(didOrHandle);
        });
        if (!resolved) {
          return { message: `Could not resolve handle: ${didOrHandle}` };
        }
        did = resolved;
      }

      // Query the database to find the actual document URI (could be either namespace)
      const { data: docDataArr } = await supabaseServerClient
        .from("documents")
        .select("uri")
        .or(documentUriFilter(did, rkey))
        .order("uri", { ascending: false })
        .limit(1);
      const docData = docDataArr?.[0];

      if (!docData) {
        return { message: `No document found for did:${did} rkey:${rkey}` };
      }

      documentUri = docData.uri;
      authorDid = did;
    } else {
      // Publication post: look up by custom domain
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

      // Query the database to find the actual document URI (could be either namespace)
      const { data: docDataArr } = await supabaseServerClient
        .from("documents")
        .select("uri")
        .or(documentUriFilter(pub.identity_did, path[0]))
        .order("uri", { ascending: false })
        .limit(1);
      const docData = docDataArr?.[0];

      if (!docData) {
        return { message: `No document found for publication ${url.host}/${path[0]}` };
      }

      documentUri = docData.uri;
      authorDid = pub.identity_did;
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

    await step.run("index-bsky-post", async () => {
      await supabaseServerClient.from("bsky_posts").upsert({
        uri: bsky_post.uri,
        cid: bsky_post.cid,
        post_view: bsky_post as Json,
      });
      await supabaseServerClient.from("document_mentions_in_bsky").upsert({
        uri: bsky_post.uri,
        document: documentUri,
        link: event.data.document_link,
      });
    });

    await step.run("create-notification", async () => {
      // Only create notification if the quote is from someone other than the author
      if (bsky_post.author.did !== authorDid) {
        // Check if a notification already exists for this post and recipient
        const { data: existingNotification } = await supabaseServerClient
          .from("notifications")
          .select("id")
          .eq("recipient", authorDid)
          .eq("data->>type", "quote")
          .eq("data->>bsky_post_uri", bsky_post.uri)
          .eq("data->>document_uri", documentUri)
          .single();

        if (!existingNotification) {
          const notification: Notification = {
            id: v7(),
            recipient: authorDid,
            data: {
              type: "quote",
              bsky_post_uri: bsky_post.uri,
              document_uri: documentUri,
            },
          };
          await supabaseServerClient.from("notifications").insert(notification);
          await pingIdentityToUpdateNotification(authorDid);
        }
      }
    });
  },
);
