import { inngest } from "app/api/inngest/client";
import { AtUri } from "@atproto/syntax";
import backupDataRaw from "./backup-data/user-restore-data.json";

// Type definition for the backup data structure
interface BackupData {
  did: string;
  publications: Array<{
    uri: string;
    record: unknown;
  }>;
  documents: Array<{
    uri: string;
    data: unknown;
  }>;
}

const backupData = backupDataRaw as BackupData;

async function main() {
  const did = backupData.did;

  // Build unified records array from publications and documents
  const allRecords = [
    ...backupData.publications.map((p) => ({
      collection: "site.standard.publication",
      rkey: new AtUri(p.uri).rkey,
      record: p.record,
    })),
    ...backupData.documents.map((d) => ({
      collection: "site.standard.document",
      rkey: new AtUri(d.uri).rkey,
      record: d.data,
    })),
  ];

  console.log("Sending PDS write events to Inngest in batches of 20...");
  console.log(`DID: ${did}`);
  console.log(`Total records: ${allRecords.length}`);
  console.log(`  - Publications: ${backupData.publications.length}`);
  console.log(`  - Documents: ${backupData.documents.length}`);

  // Process records in batches of 20
  const batchSize = 20;
  const batches = [];
  for (let i = 0; i < allRecords.length; i += batchSize) {
    batches.push(allRecords.slice(i, i + batchSize));
  }

  console.log(`Processing ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(
      `Sending batch ${i + 1}/${batches.length} (${batch.length} records)...`,
    );

    await inngest.send({
      name: "user/write-records-to-pds",
      data: { did, records: batch },
    });
  }

  console.log("All batches sent! Monitor Inngest dashboard for progress.");
}

main().catch(console.error);
