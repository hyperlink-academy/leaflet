import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";
import { AtUri } from "@atproto/syntax";

/**
 * This script finds documents that incorrectly reference pub.leaflet.publication
 * in their data.site field when an equivalent site.standard.publication record
 * exists (matching rkey).
 *
 * Usage: npx ts-node scripts/find-wrong-publication-refs.ts [--fix]
 */
async function findWrongPublicationRefs() {
  const shouldFix = process.argv.includes("--fix");

  if (shouldFix) {
    console.log("FIX MODE - Will trigger inngest function to fix documents\n");
  }

  console.log("Finding documents with wrong site field references...\n");

  // Step 1: Get all publications from both namespaces
  const { data: allPublications, error: pubError } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did");

  if (pubError) {
    console.error("Error fetching publications:", pubError.message);
    process.exit(1);
  }

  console.log(`Found ${allPublications?.length || 0} total publications\n`);

  // Build a map of (did, rkey) -> { legacyUri, standardUri }
  const pubMap = new Map<
    string,
    { legacyUri: string | null; standardUri: string | null }
  >();

  for (const pub of allPublications || []) {
    try {
      const aturi = new AtUri(pub.uri);
      const key = `${aturi.hostname}/${aturi.rkey}`;
      const existing = pubMap.get(key) || { legacyUri: null, standardUri: null };

      if (pub.uri.includes("/pub.leaflet.publication/")) {
        existing.legacyUri = pub.uri;
      } else if (pub.uri.includes("/site.standard.publication/")) {
        existing.standardUri = pub.uri;
      }

      pubMap.set(key, existing);
    } catch (e) {
      console.warn(`Invalid publication URI: ${pub.uri}`);
    }
  }

  // Find publications that exist in BOTH namespaces
  const dualPublications = Array.from(pubMap.entries()).filter(
    ([_, v]) => v.legacyUri && v.standardUri
  );

  console.log(
    `Found ${dualPublications.length} publications that exist in both namespaces\n`
  );

  if (dualPublications.length === 0) {
    console.log("No publications exist in both namespaces. Nothing to check.");
    return;
  }

  // Create a set of legacy URIs that have a standard equivalent
  const legacyUrisWithStandard = new Set(
    dualPublications.map(([_, v]) => v.legacyUri!)
  );

  // Step 2: Check document data.site field
  const { data: documents, error: docError } = await supabaseServerClient
    .from("documents")
    .select("uri, data");

  if (docError) {
    console.error("Error fetching documents:", docError.message);
    process.exit(1);
  }

  const wrongSiteRefs: Array<{
    documentUri: string;
    legacySite: string;
    correctSite: string;
  }> = [];

  for (const doc of documents || []) {
    const site = (doc.data as any)?.site;
    if (site && typeof site === "string" && legacyUrisWithStandard.has(site)) {
      try {
        const aturi = new AtUri(site);
        const correctSite = `at://${aturi.hostname}/site.standard.publication/${aturi.rkey}`;
        wrongSiteRefs.push({
          documentUri: doc.uri,
          legacySite: site,
          correctSite,
        });
      } catch (e) {
        // skip
      }
    }
  }

  console.log(`Found ${wrongSiteRefs.length} documents with wrong site field references\n`);

  for (const ref of wrongSiteRefs) {
    console.log(`Document: ${ref.documentUri}`);
    console.log(`  Current site field: ${ref.legacySite}`);
    console.log(`  Should be:          ${ref.correctSite}`);
    console.log();
  }

  // Step 3: Summary
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`\nPublications existing in both namespaces: ${dualPublications.length}`);
  console.log(`Documents with wrong site field reference: ${wrongSiteRefs.length}`);

  // Group by DID for easier action
  const affectedByDid = new Map<string, Set<string>>();
  for (const ref of wrongSiteRefs) {
    try {
      const aturi = new AtUri(ref.documentUri);
      const existing = affectedByDid.get(aturi.hostname) || new Set();
      existing.add(ref.documentUri);
      affectedByDid.set(aturi.hostname, existing);
    } catch (e) {
      // skip
    }
  }

  if (affectedByDid.size > 0) {
    console.log(`\nAffected DIDs (${affectedByDid.size}):`);
    for (const [did, docs] of affectedByDid) {
      console.log(`  ${did}: ${docs.size} document(s)`);
    }
  }

  if (wrongSiteRefs.length === 0) {
    console.log("\nNo documents are incorrectly referencing legacy publications.");
    return;
  }

  if (!shouldFix) {
    console.log("\nRun with --fix to trigger the inngest function to fix these documents.");
    return;
  }

  // Trigger fix workflow
  console.log("\n" + "=".repeat(60));
  console.log("TRIGGERING FIX");
  console.log("=".repeat(60) + "\n");

  const documentUris = wrongSiteRefs.map((r) => r.documentUri);
  const BATCH_SIZE = 50;

  for (let i = 0; i < documentUris.length; i += BATCH_SIZE) {
    const batch = documentUris.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documentUris.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches}: ${batch.length} documents`);

    try {
      const result = await inngest.send({
        name: "documents/fix-publication-references",
        data: { documentUris: batch },
      });
      console.log("  Result:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("  Error:", error);
      throw error;
    }

    if (i + BATCH_SIZE < documentUris.length) {
      console.log("  Waiting 5 seconds before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log(
    `\nSuccessfully queued ${Math.ceil(documentUris.length / BATCH_SIZE)} fix event(s) for ${documentUris.length} documents.`
  );
}

findWrongPublicationRefs();
