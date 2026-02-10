import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";

/**
 * This script finds and fixes documents_in_publications entries where:
 * - The document is a site.standard.document with site pointing to site.standard.publication
 * - But the join table still references the old pub.leaflet.publication URI
 *
 * Usage: npx ts-node scripts/fix-documents-in-publications.ts [--dry-run]
 */
async function fixDocumentsInPublications() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("DRY RUN MODE - No changes will be made\n");
  }

  console.log("Finding documents_in_publications entries that need fixing...\n");

  // Step 1: Get all site.standard.document records that have AT-URI site fields
  const { data: documents, error: docError } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .like("uri", "at://%/site.standard.document/%");

  if (docError) {
    console.error("Error fetching documents:", docError.message);
    process.exit(1);
  }

  console.log(`Found ${documents?.length || 0} site.standard.document records\n`);

  // Step 2: Get all documents_in_publications entries
  const { data: joinEntries, error: joinError } = await supabaseServerClient
    .from("documents_in_publications")
    .select("document, publication");

  if (joinError) {
    console.error("Error fetching join entries:", joinError.message);
    process.exit(1);
  }

  // Create a map of document -> publication from join table
  const joinMap = new Map<string, string>();
  for (const entry of joinEntries || []) {
    joinMap.set(entry.document, entry.publication);
  }

  console.log(`Found ${joinEntries?.length || 0} documents_in_publications entries\n`);

  // Step 2b: Get all publications to check which URIs exist
  const { data: publications, error: pubError } = await supabaseServerClient
    .from("publications")
    .select("uri");

  if (pubError) {
    console.error("Error fetching publications:", pubError.message);
    process.exit(1);
  }

  const existingPubUris = new Set((publications || []).map((p) => p.uri));
  console.log(`Found ${existingPubUris.size} publications in database\n`);

  // Step 3: Find mismatches
  const fixes: Array<{
    documentUri: string;
    currentJoinPub: string;
    correctPub: string;
  }> = [];

  const missing: Array<{
    documentUri: string;
    correctPub: string;
  }> = [];

  // Helper to find the correct publication URI that actually exists
  const findExistingPubUri = (siteUri: string): string | null => {
    // If the site URI exists directly, use it
    if (existingPubUris.has(siteUri)) {
      return siteUri;
    }

    // If it's a site.standard.publication, check if the old pub.leaflet.publication exists
    if (siteUri.includes("/site.standard.publication/")) {
      try {
        const aturi = new AtUri(siteUri);
        const oldUri = `at://${aturi.hostname}/pub.leaflet.publication/${aturi.rkey}`;
        if (existingPubUris.has(oldUri)) {
          return oldUri;
        }
      } catch (e) {
        // Invalid URI
      }
    }

    // If it's a pub.leaflet.publication, check if site.standard.publication exists
    if (siteUri.includes("/pub.leaflet.publication/")) {
      try {
        const aturi = new AtUri(siteUri);
        const newUri = `at://${aturi.hostname}/site.standard.publication/${aturi.rkey}`;
        if (existingPubUris.has(newUri)) {
          return newUri;
        }
      } catch (e) {
        // Invalid URI
      }
    }

    return null;
  };

  for (const doc of documents || []) {
    const site = (doc.data as any)?.site;

    // Only care about documents with AT-URI site fields pointing to publications
    if (!site || !site.startsWith("at://")) {
      continue;
    }

    // Must be a publication reference
    if (!site.includes("/site.standard.publication/") && !site.includes("/pub.leaflet.publication/")) {
      continue;
    }

    const currentJoinPub = joinMap.get(doc.uri);
    const correctPub = findExistingPubUri(site);

    if (!correctPub) {
      console.warn(`  WARNING: No publication found for document ${doc.uri} (site: ${site})`);
      continue;
    }

    if (!currentJoinPub) {
      // Missing entry - document has a publication but no join table entry
      missing.push({
        documentUri: doc.uri,
        correctPub,
      });
    } else if (currentJoinPub !== correctPub) {
      // Mismatch - join table has different publication than what should be used
      fixes.push({
        documentUri: doc.uri,
        currentJoinPub,
        correctPub,
      });
    }
  }

  // Also check for site.standard.document records that have pub.leaflet.publication in site field
  // (these should have been fixed but let's check)
  const staleRefs: Array<{
    documentUri: string;
    staleSite: string;
  }> = [];

  for (const doc of documents || []) {
    const site = (doc.data as any)?.site;
    if (site && site.includes("/pub.leaflet.publication/")) {
      staleRefs.push({
        documentUri: doc.uri,
        staleSite: site,
      });
    }
  }

  // Report findings
  console.log("=".repeat(60));
  console.log("FINDINGS");
  console.log("=".repeat(60));

  console.log(`\nMismatched entries (join table has wrong publication): ${fixes.length}`);
  for (const fix of fixes) {
    console.log(`  Document: ${fix.documentUri}`);
    console.log(`    Join table has: ${fix.currentJoinPub}`);
    console.log(`    Should be:      ${fix.correctPub}`);
  }

  console.log(`\nMissing entries (document has publication but no join entry): ${missing.length}`);
  for (const m of missing) {
    console.log(`  Document: ${m.documentUri}`);
    console.log(`    Will add:       ${m.correctPub}`);
  }

  console.log(`\nStale site references (document still points to pub.leaflet.publication): ${staleRefs.length}`);
  for (const s of staleRefs) {
    console.log(`  Document: ${s.documentUri}`);
    console.log(`    Stale site:     ${s.staleSite}`);
  }

  if (fixes.length === 0 && missing.length === 0) {
    console.log("\nNo fixes needed!");
    return;
  }

  if (dryRun) {
    console.log("\nDRY RUN - No changes made. Run without --dry-run to apply fixes.");
    return;
  }

  // Step 4: Apply fixes
  console.log("\n" + "=".repeat(60));
  console.log("APPLYING FIXES");
  console.log("=".repeat(60) + "\n");

  let fixedCount = 0;
  let errorCount = 0;

  // Fix mismatched entries
  for (const fix of fixes) {
    console.log(`Fixing: ${fix.documentUri}`);

    // Delete old entry
    const { error: deleteError } = await supabaseServerClient
      .from("documents_in_publications")
      .delete()
      .eq("document", fix.documentUri)
      .eq("publication", fix.currentJoinPub);

    if (deleteError) {
      console.error(`  Error deleting old entry: ${deleteError.message}`);
      errorCount++;
      continue;
    }

    // Insert correct entry
    const { error: insertError } = await supabaseServerClient
      .from("documents_in_publications")
      .upsert({
        document: fix.documentUri,
        publication: fix.correctPub,
      });

    if (insertError) {
      console.error(`  Error inserting new entry: ${insertError.message}`);
      errorCount++;
      continue;
    }

    console.log(`  Fixed: ${fix.currentJoinPub} -> ${fix.correctPub}`);
    fixedCount++;
  }

  // Add missing entries
  for (const m of missing) {
    console.log(`Adding missing entry: ${m.documentUri}`);

    const { error: insertError } = await supabaseServerClient
      .from("documents_in_publications")
      .upsert({
        document: m.documentUri,
        publication: m.correctPub,
      });

    if (insertError) {
      console.error(`  Error inserting entry: ${insertError.message}`);
      errorCount++;
      continue;
    }

    console.log(`  Added: ${m.correctPub}`);
    fixedCount++;
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Fixed: ${fixedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (staleRefs.length > 0) {
    console.log(`\nWARNING: ${staleRefs.length} documents still have stale pub.leaflet.publication references in their site field.`);
    console.log("Run the migration script to fix these.");
  }
}

fixDocumentsInPublications();
