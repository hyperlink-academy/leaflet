import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";
const idResolver = new IdResolver();
import { Firehose, MemoryRunner, Event } from "@atproto/sync";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletDocument,
  PubLeafletGraphSubscription,
  PubLeafletPublication,
  PubLeafletComment,
} from "lexicons/api";
import {
  AppBskyEmbedExternal,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
} from "@atproto/api";
import { AtUri } from "@atproto/syntax";
import { writeFile, readFile } from "fs/promises";
import { createIdentity } from "actions/createIdentity";
import { drizzle } from "drizzle-orm/node-postgres";
import { inngest } from "app/api/inngest/client";

const cursorFile = process.env.CURSOR_FILE || "/cursor/cursor";

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
const QUOTE_PARAM = "/l-quote/";
async function main() {
  let startCursor;
  try {
    let file = (await readFile(cursorFile)).toString();
    console.log("START CURSOR: " + file);
    startCursor = parseInt(file);
    if (Number.isNaN(startCursor)) startCursor = undefined;
  } catch (e) {}

  async function handleEvent(evt: Event) {
    if (evt.event === "identity") {
      if (evt.handle)
        await supabase
          .from("bsky_profiles")
          .update({ handle: evt.handle })
          .eq("did", evt.did);
    }
    if (
      evt.event == "account" ||
      evt.event === "identity" ||
      evt.event === "sync"
    )
      return;
    if (evt.collection !== "app.bsky.feed.post")
      console.log(`${evt.event} in ${evt.collection}`);
    if (evt.collection === ids.PubLeafletDocument) {
      if (evt.event === "create" || evt.event === "update") {
        let record = PubLeafletDocument.validateRecord(evt.record);
        if (!record.success) {
          return;
        }
        await supabase.from("documents").upsert({
          uri: evt.uri.toString(),
          data: record.value as Json,
        });
        let publicationURI = new AtUri(record.value.publication);

        if (publicationURI.host !== evt.uri.host) {
          console.log("Unauthorized to create post!");
          return;
        }
        await supabase.from("documents_in_publications").insert({
          publication: record.value.publication,
          document: evt.uri.toString(),
        });
      }
      if (evt.event === "delete") {
        await supabase.from("documents").delete().eq("uri", evt.uri.toString());
      }
    }
    if (evt.collection === ids.PubLeafletPublication) {
      if (evt.event === "create" || evt.event === "update") {
        let record = PubLeafletPublication.validateRecord(evt.record);
        if (!record.success) return;
        let { error } = await supabase.from("publications").upsert({
          uri: evt.uri.toString(),
          identity_did: evt.did,
          name: record.value.name,
          record: record.value as Json,
        });

        if (error && error.code === "23503") {
          let db = drizzle(process.env.DB_URL!);
          await createIdentity(db, { atp_did: evt.did });
          await supabase.from("publications").upsert({
            uri: evt.uri.toString(),
            identity_did: evt.did,
            name: record.value.name,
            record: record.value as Json,
          });
        }
      }
      if (evt.event === "delete") {
        await supabase
          .from("publications")
          .delete()
          .eq("uri", evt.uri.toString());
      }
    }
    if (evt.collection === ids.PubLeafletComment) {
      if (evt.event === "create" || evt.event === "update") {
        let record = PubLeafletComment.validateRecord(evt.record);
        if (!record.success) return;
        let { error } = await supabase.from("comments_on_documents").upsert({
          uri: evt.uri.toString(),
          profile: evt.did,
          document: record.value.subject,
          record: record.value as Json,
        });
      }
      if (evt.event === "delete") {
        await supabase
          .from("comments_on_documents")
          .delete()
          .eq("uri", evt.uri.toString());
      }
    }
    if (evt.collection === ids.PubLeafletGraphSubscription) {
      if (evt.event === "create" || evt.event === "update") {
        let record = PubLeafletGraphSubscription.validateRecord(evt.record);
        if (!record.success) return;
        let { error } = await supabase
          .from("publication_subscriptions")
          .upsert({
            uri: evt.uri.toString(),
            identity: evt.did,
            publication: record.value.publication,
            record: record.value as Json,
          });
        if (error && error.code === "23503") {
          await createIdentity(db, { atp_did: evt.did });
          await supabase.from("publication_subscriptions").upsert({
            uri: evt.uri.toString(),
            identity: evt.did,
            publication: record.value.publication,
            record: record.value as Json,
          });
        }
      }
      if (evt.event === "delete") {
        await supabase
          .from("publication_subscriptions")
          .delete()
          .eq("uri", evt.uri.toString());
      }
    }
    // if (evt.collection === ids.AppBskyActorProfile) {
    //   //only listen to updates because we should fetch it for the first time when they subscribe!
    //   if (evt.event === "update") {
    //     await supabaseServerClient
    //       .from("bsky_profiles")
    //       .update({ record: evt.record as Json })
    //       .eq("did", evt.did);
    //   }
    // }
    if (evt.collection === "app.bsky.feed.post") {
      if (evt.event !== "create") return;

      // Early exit if no embed
      if (
        !evt.record ||
        typeof evt.record !== "object" ||
        !("embed" in evt.record)
      )
        return;

      // Quick check if embed might contain our quote param
      const embedStr = JSON.stringify(evt.record.embed);
      if (!embedStr.includes(QUOTE_PARAM)) return;

      // Now validate the record since we know it might be relevant
      let record = AppBskyFeedPost.validateRecord(evt.record);
      if (!record.success) return;

      let embed =
        AppBskyEmbedExternal.isMain(record.value.embed) &&
        record.value.embed.external.uri.includes(QUOTE_PARAM)
          ? record.value.embed.external.uri
          : null;
      if (embed) {
        console.log(
          "processing post mention: " + embed + " in " + evt.uri.toString(),
        );
        await inngest.send({
          name: "appview/index-bsky-post-mention",
          data: { post_uri: evt.uri.toString(), document_link: embed },
        });
      }
    }
  }
  async function timedHandleEvent(evt: Event) {
    const startTime = performance.now();

    if (evt.event === "identity") {
      if (evt.handle)
        await supabase
          .from("bsky_profiles")
          .update({ handle: evt.handle })
          .eq("did", evt.did);
    }

    await handleEvent(evt);
    if (
      evt.event == "account" ||
      evt.event === "identity" ||
      evt.event === "sync"
    ) {
      const endTime = performance.now();
      console.log(
        `${evt.event} in ${evt.event || "unknown"} took ${endTime - startTime}ms`,
      );
      return;
    }

    const endTime = performance.now();
    console.log(
      `${evt.event} in ${evt.collection || "unknown"} took ${endTime - startTime}ms`,
    );
  }

  const runner = new MemoryRunner({
    startCursor,
    setCursor: async (cursor) => {
      console.log(cursor);
      // persist cursor
      await writeFile(cursorFile, cursor.toString());
    },
  });
  let firehose = new Firehose({
    service: "wss://relay1.us-west.bsky.network",
    subscriptionReconnectDelay: 3000,
    excludeAccount: true,
    excludeIdentity: true,
    runner,
    idResolver,
    filterCollections: [
      ids.PubLeafletDocument,
      ids.PubLeafletPublication,
      ids.PubLeafletGraphSubscription,
      ids.PubLeafletComment,
      // ids.AppBskyActorProfile,
      "app.bsky.feed.post",
    ],
    handleEvent,
    onError: (err) => {
      console.error(err);
    },
  });
  console.log("starting firehose consumer");
  firehose.start();
  const cleanup = async () => {
    console.log("shutting down firehose...");
    client.release();
    await firehose.destroy();
    await runner.destroy();
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main();
