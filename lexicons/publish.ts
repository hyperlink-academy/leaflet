import * as fs from "fs";
import * as path from "path";
import * as dns from "dns/promises";
import { AtpAgent } from "@atproto/api";
import { deepEquals } from "src/utils/deepEquals";

function readLexiconFiles(): { id: string }[] {
  const lexiconDir = path.join("lexicons", "pub", "leaflet");
  const lexiconFiles: { id: string }[] = [];

  function processDirectory(dirPath: string) {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isFile()) {
          try {
            const fileContent = fs.readFileSync(itemPath, "utf8");
            const jsonData = JSON.parse(fileContent);
            lexiconFiles.push(jsonData);
          } catch (parseError) {
            console.error(
              `Error parsing JSON from file ${itemPath}:`,
              parseError,
            );
          }
        } else if (stats.isDirectory()) {
          processDirectory(itemPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
  }

  processDirectory(lexiconDir);

  return lexiconFiles;
}
// Use the function to get all leaflet JSON files
const lexiconsData = readLexiconFiles();

const agent = new AtpAgent({
  service: "https://bsky.social",
});
async function main() {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const LEAFLET_APP_PASSWORD = process.env.LEAFLET_APP_PASSWORD;
  if (!LEAFLET_APP_PASSWORD)
    throw new Error("Missing env var LEAFLET_APP_PASSWORD");
  if (!VERCEL_TOKEN) throw new Error("Missing env var VERCEL_TOKEN");
  //login with the agent
  await agent.login({
    identifier: "leaflet.pub",
    password: LEAFLET_APP_PASSWORD,
  });
  const uniqueIds = Array.from(new Set(lexiconsData.map((lex) => lex.id)));
  let txtRecordValue = `did=${agent.assertDid}`;
  for (let id of uniqueIds) {
    let host = id.split(".").slice(0, -1).reverse().join(".");
    host = `_lexicon.${host}`;
    let txtRecords = await getTXTRecords(host);
    if (!txtRecords.find((r) => r.join("") === txtRecordValue)) {
      let name = host.split(".").slice(0, -2).join(".") || "";
      console.log("creating txt record", name);
      let res = await fetch(
        `https://api.vercel.com/v2/domains/leaflet.pub/records?teamId=team_42xaJiZMTw9Sr7i0DcLTae9d`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name,
            type: "TXT",
            value: txtRecordValue,
            ttl: 60,
          }),
        },
      );
      if (res.status !== 200) {
        console.log(await res.json());
        return;
      }
    }
  }
  for (let lex of lexiconsData) {
    let record = await getRecord(lex.id, agent);
    let newRecord = {
      $type: "com.atproto.lexicon.schema",
      ...lex,
    };
    if (!record || !deepEquals(record.data.value, newRecord)) {
      console.log("putting record", lex.id);
      await agent.com.atproto.repo.putRecord({
        collection: "com.atproto.lexicon.schema",
        repo: agent.assertDid,
        rkey: lex.id,
        record: newRecord,
      });
    }
  }
}

let getTXTRecords = async (host: string) => {
  try {
    let txtrecords = await dns.resolveTxt(host);
    return txtrecords;
  } catch (e) {
    return [];
  }
};

main();

async function getRecord(rkey: string, agent: AtpAgent) {
  try {
    let record = await agent.com.atproto.repo.getRecord({
      collection: "com.atproto.lexicon.schema",
      repo: agent.assertDid,
      rkey,
    });
    return record;
  } catch (e) {
    //@ts-ignore
    if (e.error === "RecordNotFound") return null;
    throw e;
  }
}
