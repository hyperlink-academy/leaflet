import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";
const idResolver = new IdResolver();
import { Firehose, MemoryRunner } from "@atproto/sync";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletDocument,
  PubLeafletPublication,
  PubLeafletPublicationSubscription,
} from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { writeFile, readFile } from "fs/promises";

const cursorFile = process.env.CURSOR_FILE || "/cursor/cursor";

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
async function main() {
  let startCursor;
  try {
    startCursor = parseInt((await readFile(cursorFile)).toString());
  } catch (e) {}
  const runner = new MemoryRunner({
    startCursor,
    setCursor: async (cursor) => {
      await writeFile(cursorFile, cursor.toString());
      // persist cursor
    },
  });
  let firehose = new Firehose({
    excludeAccount: true,
    excludeIdentity: true,
    runner,
    idResolver,
    filterCollections: [
      ids.PubLeafletDocument,
      ids.PubLeafletPublication,
      ids.PubLeafletPublicationSubscription,
    ],
    handleEvent: async (evt) => {
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
          await supabase.from("publications").upsert({
            uri: evt.uri.toString(),
            identity_did: evt.did,
            name: record.value.name,
            record: record.value as Json,
          });
        }
        if (evt.event === "delete") {
          await supabase
            .from("publications")
            .delete()
            .eq("uri", evt.uri.toString());
        }
      }
      if (evt.collection === ids.PubLeafletPublication) {
        if (evt.event === "create" || evt.event === "update") {
          let record = PubLeafletPublicationSubscription.validateRecord(
            evt.record,
          );
          if (!record.success) return;
          await supabase.from("publication_subscriptions").upsert({
            uri: evt.uri.toString(),
            identity: evt.did,
            publication: record.value.publication,
            record: record.value as Json,
          });
        }
        if (evt.event === "delete") {
          await supabase
            .from("publication_subscriptions")
            .delete()
            .eq("uri", evt.uri.toString());
        }
      }
    },
    onError: (err) => {
      console.error(err);
    },
  });
  console.log("starting firehose consumer");
  firehose.start();
  const cleanup = () => {
    console.log("shutting down firehose...");
    firehose.destroy();
    runner.destroy();
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main();
