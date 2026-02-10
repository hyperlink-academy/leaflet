import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";
import { AtUri } from "@atproto/syntax";

/**
 * This script finds site.standard.document records that reference pub.leaflet.publication
 * publications for which a corresponding site.standard.publication also exists,
 * and triggers the migrate_user_to_standard function to fix them.
 *
 * This can happen when:
 * 1. A user creates site.standard.document records pointing to pub.leaflet.publication
 * 2. Later, the pub.leaflet.publication gets migrated to site.standard.publication
 * 3. But the site.standard.document records' site field wasn't updated
 */
async function findOrphanedStandardDocuments() {
  console.log(
    "Finding site.standard.document records with orphaned pub.leaflet.publication references...\n",
  );

  // Step 1: Get all site.standard.document records that reference pub.leaflet.publication
  const { data: documents, error: docError } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .like("uri", "at://%/site.standard.document/%");

  if (docError) {
    console.error("Error fetching documents:", docError.message);
    return;
  }

  console.log(
    `Found ${documents?.length || 0} site.standard.document records total`,
  );

  // Filter to those with site field pointing to pub.leaflet.publication
  const docsWithOldPubRef = (documents || []).filter((doc) => {
    const site = (doc.data as any)?.site;
    return (
      site &&
      typeof site === "string" &&
      site.includes("/pub.leaflet.publication/")
    );
  });

  console.log(
    `Found ${docsWithOldPubRef.length} documents referencing pub.leaflet.publication\n`,
  );

  if (docsWithOldPubRef.length === 0) {
    console.log("No orphaned documents found.");
    return;
  }

  // Step 2: Get all site.standard.publication URIs to check for migration
  const { data: standardPubs, error: pubError } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did")
    .like("uri", "at://%/site.standard.publication/%");

  if (pubError) {
    console.error("Error fetching publications:", pubError.message);
    return;
  }

  // Create a set of (did, rkey) pairs that have site.standard.publication
  const migratedPubKeys = new Set<string>();
  for (const pub of standardPubs || []) {
    try {
      const aturi = new AtUri(pub.uri);
      migratedPubKeys.add(`${aturi.hostname}/${aturi.rkey}`);
    } catch (e) {
      // skip invalid URIs
    }
  }

  console.log(
    `Found ${migratedPubKeys.size} site.standard.publication records\n`,
  );

  // Step 3: Find documents where the referenced pub.leaflet.publication has a corresponding site.standard.publication
  const orphanedDocs: Array<{
    documentUri: string;
    oldPubUri: string;
    newPubUri: string;
    documentAuthorDid: string;
    pubAuthorDid: string;
  }> = [];

  for (const doc of docsWithOldPubRef) {
    const site = (doc.data as any)?.site as string;
    try {
      const oldPubAturi = new AtUri(site);
      const key = `${oldPubAturi.hostname}/${oldPubAturi.rkey}`;

      if (migratedPubKeys.has(key)) {
        // This document references a pub.leaflet.publication that has been migrated
        const docAturi = new AtUri(doc.uri);
        const newPubUri = `at://${oldPubAturi.hostname}/site.standard.publication/${oldPubAturi.rkey}`;

        orphanedDocs.push({
          documentUri: doc.uri,
          oldPubUri: site,
          newPubUri,
          documentAuthorDid: docAturi.hostname,
          pubAuthorDid: oldPubAturi.hostname,
        });
      }
    } catch (e) {
      console.error(`Invalid URI in document ${doc.uri}: ${site}`);
    }
  }

  console.log(
    `Found ${orphanedDocs.length} orphaned documents that need migration\n`,
  );

  if (orphanedDocs.length === 0) {
    console.log("No documents need migration.");
    return;
  }

  // Step 4: Group by document author DID
  const didToDocuments = new Map<string, typeof orphanedDocs>();
  for (const doc of orphanedDocs) {
    const existing = didToDocuments.get(doc.documentAuthorDid) || [];
    existing.push(doc);
    didToDocuments.set(doc.documentAuthorDid, existing);
  }

  console.log("DIDs that need migration:");
  console.log("=".repeat(60));

  const dids = Array.from(didToDocuments.keys());
  for (const did of dids) {
    const docs = didToDocuments.get(did)!;
    console.log(`\n${did} (${docs.length} document(s)):`);
    for (const doc of docs) {
      console.log(`  Document: ${doc.documentUri}`);
      console.log(`    Old site ref: ${doc.oldPubUri}`);
      console.log(`    New site ref: ${doc.newPubUri}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\nTotal DIDs needing migration: ${dids.length}`);
  console.log(`Total documents needing update: ${orphanedDocs.length}`);

  if (orphanedDocs.length === 0) {
    return;
  }

  // Trigger fix workflow with document URIs directly
  console.log("\nTriggering fix workflow...");

  // Group document URIs into batches (max 50 per event to avoid payload size issues)
  const documentUris = orphanedDocs.map((d) => d.documentUri);
  const BATCH_SIZE = 50;

  for (let i = 0; i < documentUris.length; i += BATCH_SIZE) {
    const batch = documentUris.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documentUris.length / BATCH_SIZE);

    console.log(`\nBatch ${batchNum}/${totalBatches}:`);
    console.log(`  Documents in batch: ${batch.length}`);

    try {
      const result = await inngest.send({
        name: "documents/fix-publication-references",
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

findOrphanedStandardDocuments();
