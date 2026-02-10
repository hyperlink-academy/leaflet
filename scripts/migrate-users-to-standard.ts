import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";
import { AtUri } from "@atproto/syntax";

async function migrateUsersToStandard() {
  const uniqueDids = new Set<string>();

  // Get DIDs from publications with old schema
  console.log("Fetching publications with old schema...");
  const { data: publications, error: pubError } = await supabaseServerClient
    .from("publications")
    .select("identity_did, uri")
    .like("uri", "at://%/pub.leaflet.publication/%");

  if (pubError) {
    console.error("Error fetching publications:", pubError.message);
    return;
  }

  for (const pub of publications || []) {
    if (pub.identity_did) {
      uniqueDids.add(pub.identity_did);
    }
  }
  console.log(`Found ${publications?.length || 0} old publications`);

  // Get DIDs from documents with old schema
  console.log("Fetching documents with old schema...");
  const { data: documents, error: docError } = await supabaseServerClient
    .from("documents")
    .select("uri")
    .like("uri", "at://%/pub.leaflet.document/%");

  if (docError) {
    console.error("Error fetching documents:", docError.message);
    return;
  }

  for (const doc of documents || []) {
    try {
      const aturi = new AtUri(doc.uri);
      uniqueDids.add(aturi.hostname);
    } catch (e) {
      console.error(`Invalid URI: ${doc.uri}`);
    }
  }
  console.log(`Found ${documents?.length || 0} old documents`);

  // Get DIDs from subscriptions with old schema
  console.log("Fetching subscriptions with old schema...");
  const { data: subscriptions, error: subError } = await supabaseServerClient
    .from("publication_subscriptions")
    .select("identity, uri")
    .like("uri", "at://%/pub.leaflet.graph.subscription/%");

  if (subError) {
    console.error("Error fetching subscriptions:", subError.message);
    return;
  }

  for (const sub of subscriptions || []) {
    if (sub.identity) {
      uniqueDids.add(sub.identity);
    }
  }
  console.log(`Found ${subscriptions?.length || 0} old subscriptions`);

  // Get DIDs from site.standard.document records that reference pub.leaflet.publication
  // These are documents created in the new format but pointing to old publication URIs
  console.log("Fetching site.standard.document records with stale pub.leaflet.publication references...");
  const { data: standardDocs, error: standardDocError } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .like("uri", "at://%/site.standard.document/%");

  if (standardDocError) {
    console.error("Error fetching standard documents:", standardDocError.message);
    return;
  }

  let staleRefCount = 0;
  for (const doc of standardDocs || []) {
    try {
      const site = (doc.data as any)?.site;
      if (site && typeof site === "string" && site.includes("/pub.leaflet.publication/")) {
        const aturi = new AtUri(doc.uri);
        uniqueDids.add(aturi.hostname);
        staleRefCount++;
      }
    } catch (e) {
      console.error(`Invalid URI: ${doc.uri}`);
    }
  }
  console.log(`Found ${staleRefCount} site.standard.document records with stale references`);

  console.log(`\nTotal unique DIDs before filtering: ${uniqueDids.size}`);

  // Filter out DIDs that already have site.standard records
  // Fetch all migrated DIDs in bulk instead of per-DID queries
  console.log("Checking for already migrated users...");
  const alreadyMigratedDids = new Set<string>();

  // Get all DIDs that have site.standard.publication records
  const { data: newPubs } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .like("uri", "at://%/site.standard.publication/%");

  for (const pub of newPubs || []) {
    if (pub.identity_did) alreadyMigratedDids.add(pub.identity_did);
  }

  // Get all DIDs that have site.standard.document records
  const { data: newDocs } = await supabaseServerClient
    .from("documents")
    .select("uri")
    .like("uri", "at://%/site.standard.document/%");

  for (const doc of newDocs || []) {
    try {
      const aturi = new AtUri(doc.uri);
      alreadyMigratedDids.add(aturi.hostname);
    } catch (e) {
      // ignore invalid URIs
    }
  }

  // Get all DIDs that have site.standard.graph.subscription records
  const { data: newSubs } = await supabaseServerClient
    .from("publication_subscriptions")
    .select("identity")
    .like("uri", "at://%/site.standard.graph.subscription/%");

  for (const sub of newSubs || []) {
    if (sub.identity) alreadyMigratedDids.add(sub.identity);
  }

  console.log(`Found ${alreadyMigratedDids.size} already migrated DIDs`);

  // Filter out already migrated DIDs
  const dids = Array.from(uniqueDids).filter((did) => {
    if (alreadyMigratedDids.has(did)) {
      return false;
    }
    return true;
  });

  console.log(`\nTotal unique DIDs to migrate (after filtering): ${dids.length}`);

  if (dids.length === 0) {
    console.log("No users to migrate.");
    return;
  }

  // Batch send events to inngest (inngest.send accepts an array)
  console.log("Sending migration events to Inngest...");
  const events = dids.map((did) => ({
    name: "user/migrate-to-standard" as const,
    data: { did },
  }));

  const BATCH_SIZE = 100;

  console.log("DIDs to migrate:", dids);

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(events.length / BATCH_SIZE);

    console.log(`\nBatch ${batchNum}/${totalBatches}:`);
    console.log(`  Events in batch: ${batch.length}`);
    console.log(
      `  DIDs:`,
      batch.map((e) => e.data.did),
    );

    try {
      console.log("  Calling inngest.send()...");
      const result = await inngest.send(batch);
      console.log("  inngest.send() result:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("  inngest.send() error:", error);
      throw error;
    }

    console.log(
      `  Sent batch ${batchNum}/${totalBatches} (${batch.length} events)`,
    );

    if (i + BATCH_SIZE < events.length) {
      // Wait 30 seconds before next batch (only if there are more batches)
      console.log("  Waiting 2 minutes before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
    }
  }

  console.log(`\nSuccessfully queued ${dids.length} migration events.`);
}

migrateUsersToStandard();
