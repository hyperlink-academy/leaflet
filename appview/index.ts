import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";
const idResolver = new IdResolver();
import { Firehose, MemoryRunner } from "@atproto/sync";
import { ids } from "lexicons/src/lexicons";
import { PubLeafletPublication } from "lexicons/src";

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
    filterCollections: ["pub.leaflet.document", ids.PubLeafletPublication],
    handleEvent: async (evt) => {
      if (evt.event === "create" || evt.event === "update") {
        console.log("creating record in " + evt.collection);
        if (evt.collection === ids.PubLeafletPublication) {
          let record = PubLeafletPublication.validateRecord(evt.record);
          if (!record.success) return;
          console.log(
            await supabase.from("publications").insert({
              did: evt.did,
              name: record.value.name,
              rkey: evt.rkey,
            }),
          );
        }
      }
      if (evt.event === "delete") {
        console.log("deleting ", evt.rkey);
        if (evt.collection === ids.PubLeafletPublication) {
          console.log(
            await supabase
              .from("publications")
              .delete()
              .eq("did", evt.did)
              .eq("rkey", evt.rkey),
          );
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
