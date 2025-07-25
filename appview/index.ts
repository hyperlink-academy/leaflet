import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";
const idResolver = new IdResolver();
import { Firehose, MemoryRunner } from "@atproto/sync";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletDocument,
  PubLeafletGraphSubscription,
  PubLeafletPublication,
} from "lexicons/api";
import {
  AppBskyEmbedExternal,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
} from "@atproto/api";
import { AtUri } from "@atproto/syntax";
import { writeFile, readFile } from "fs/promises";
import { createIdentity } from "actions/createIdentity";
import { supabaseServerClient } from "supabase/serverClient";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { inngest } from "app/api/inngest/client";

const cursorFile = process.env.CURSOR_FILE || "/cursor/cursor";

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
const QUOTE_PARAM = "/quote/";
async function main() {
  let startCursor;
  try {
    startCursor = parseInt((await readFile(cursorFile)).toString());
  } catch (e) {}

  const client = postgres(process.env.DB_URL!);
  const db = drizzle(client);
  const runner = new MemoryRunner({
    startCursor,
    setCursor: async (cursor) => {
      await writeFile(cursorFile, cursor.toString());
      // persist cursor
    },
  });
  let firehose = new Firehose({
    subscriptionReconnectDelay: 3000,
    excludeAccount: true,
    excludeIdentity: true,
    runner,
    idResolver,
    filterCollections: [
      ids.PubLeafletDocument,
      ids.PubLeafletPublication,
      ids.PubLeafletGraphSubscription,
      ids.AppBskyActorProfile,
      "app.bsky.feed.post",
    ],
    handleEvent: async (evt) => {
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
          await supabase
            .from("documents")
            .delete()
            .eq("uri", evt.uri.toString());
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
      if (evt.collection === ids.AppBskyActorProfile) {
        //only listen to updates because we should fetch it for the first time when they subscribe!
        if (evt.event === "update") {
          await supabaseServerClient
            .from("bsky_profiles")
            .update({ record: evt.record as Json })
            .eq("did", evt.did);
        }
      }
      if (evt.collection === "app.bsky.feed.post") {
        if (evt.event !== "create") return;
        let record = AppBskyFeedPost.validateRecord(evt.record);
        if (!record.success) return;
        let linkFacet = record.value.facets?.find((f) =>
          f.features.find(
            (f) =>
              AppBskyRichtextFacet.isLink(f) && f.uri.includes(QUOTE_PARAM),
          ),
        );
        let link = (
          linkFacet?.features.find(
            (f) =>
              AppBskyRichtextFacet.isLink(f) && f.uri.includes(QUOTE_PARAM),
          ) as AppBskyRichtextFacet.Link | undefined
        )?.uri;

        let embed =
          AppBskyEmbedExternal.isMain(record.value.embed) &&
          record.value.embed.external.uri.includes(QUOTE_PARAM)
            ? record.value.embed.external.uri
            : null;
        let pubUrl = embed || link;
        if (pubUrl) {
          inngest.send({
            name: "appview/index-bsky-post-mention",
            data: { post_uri: evt.uri.toString(), document_link: pubUrl },
          });
        }
      }
    },
    onError: (err) => {
      console.error(err);
    },
  });
  console.log("starting firehose consumer");
  firehose.start();
  const cleanup = async () => {
    console.log("shutting down firehose...");
    await client.end();
    await firehose.destroy();
    await runner.destroy();
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main();
