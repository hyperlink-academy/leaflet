import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";
const idResolver = new IdResolver();
import { Firehose, MemoryRunner } from "@atproto/sync";
import { ids } from "lexicons/src/lexicons";
import { PubLeafletPost, PubLeafletPublication } from "lexicons/src";

const cursorFile = "./cursor";

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
async function main() {
  let firehose = new Firehose({
    excludeAccount: true,
    excludeIdentity: true,
    idResolver,
    filterCollections: [
      "pub.leaflet.document",
      ids.PubLeafletPublication,
      ids.PubLeafletPost,
    ],
    handleEvent: async (evt) => {
      if (
        evt.event == "account" ||
        evt.event === "identity" ||
        evt.event === "sync"
      )
        return;
      if (evt.collection === ids.PubLeafletPublication) {
        if (evt.event === "create" || evt.event === "update") {
          let record = PubLeafletPublication.validateRecord(evt.record);
          if (!record.success) return;
          console.log(
            await supabase.from("publications").upsert({
              did: evt.did,
              name: record.value.name,
              rkey: evt.rkey,
            }),
          );
        }
        if (evt.event === "delete") {
          console.log("deleting ", evt.rkey);
          console.log(
            await supabase
              .from("publications")
              .delete()
              .eq("did", evt.did)
              .eq("rkey", evt.rkey),
          );
        }
      }
      if (evt.collection === ids.PubLeafletPost) {
        if (evt.event === "create" || evt.event === "update") {
          let record = PubLeafletPost.validateRecord(evt.record);
          if (!record.success) return;
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
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main();

//Should I make a helper for writing these hmmm... I need to make create / updates for all of these
// Creates should basically be the same as updates right? Ya, as long as you make sure to upsert stuff!
//
