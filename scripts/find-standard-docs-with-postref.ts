import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";

const FIX_MODE = process.argv.includes("--fix");

/**
 * This script finds site.standard.document records that have the legacy
 * `postRef` field set on their record.
 *
 * The site.standard.document schema uses `bskyPostRef`, while the legacy
 * pub.leaflet.document schema uses `postRef`. Documents in the site.standard
 * namespace should not have the `postRef` field.
 *
 * Usage:
 *   npx tsx scripts/find-standard-docs-with-postref.ts        # Find only
 *   npx tsx scripts/find-standard-docs-with-postref.ts --fix  # Find and trigger fix
 */
async function findStandardDocsWithPostRef() {
  console.log(
    "Finding site.standard.document records with postRef field set...\n",
  );

  const { data: documents, error } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .like("uri", "at://%/site.standard.document/%")
    .not("data->postRef", "is", null);

  if (error) {
    console.error("Error fetching documents:", error.message);
    process.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log("No site.standard.document records found with postRef field.");
    return;
  }

  console.log(
    `Found ${documents.length} site.standard.document records with postRef:\n`,
  );
  console.log("=".repeat(80));

  for (const doc of documents) {
    const data = doc.data as Record<string, unknown>;
    const postRef = data.postRef as { uri?: string; cid?: string } | undefined;
    const bskyPostRef = data.bskyPostRef as
      | { uri?: string; cid?: string }
      | undefined;

    console.log(`\nDocument URI: ${doc.uri}`);
    console.log(`  Title: ${data.title || "(no title)"}`);
    console.log(`  postRef: ${JSON.stringify(postRef)}`);
    if (bskyPostRef) {
      console.log(`  bskyPostRef: ${JSON.stringify(bskyPostRef)}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`\nTotal: ${documents.length} documents`);

  if (!FIX_MODE) {
    console.log("\nRun with --fix to trigger the fix workflow.");
    return;
  }

  // Trigger the fix workflow
  console.log("\nTriggering fix workflow...");

  const documentUris = documents.map((d) => d.uri);
  const BATCH_SIZE = 50;

  for (let i = 0; i < documentUris.length; i += BATCH_SIZE) {
    const batch = documentUris.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documentUris.length / BATCH_SIZE);

    console.log(`\nBatch ${batchNum}/${totalBatches}:`);
    console.log(`  Documents in batch: ${batch.length}`);

    try {
      const result = await inngest.send({
        name: "documents/fix-postref",
        data: { documentUris: batch },
      });
      console.log("  inngest.send() result:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("  inngest.send() error:", error);
      throw error;
    }

    console.log(
      `  Sent batch ${batchNum}/${totalBatches} (${batch.length} documents)`,
    );

    if (i + BATCH_SIZE < documentUris.length) {
      console.log("  Waiting 5 seconds before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
    }
  }

  console.log(
    `\nSuccessfully queued ${Math.ceil(documentUris.length / BATCH_SIZE)} fix events for ${documentUris.length} documents.`,
  );
}

findStandardDocsWithPostRef();
