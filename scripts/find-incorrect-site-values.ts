import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";

/**
 * This script finds ALL documents_in_publications entries where the document
 * has an incorrect site value (doesn't match the publication it belongs to).
 *
 * Usage: npx ts-node scripts/find-incorrect-site-values.ts
 */

function buildValidSiteValues(pubUri: string): Set<string> {
  const validValues = new Set<string>([pubUri]);

  try {
    const aturi = new AtUri(pubUri);

    if (pubUri.includes("/site.standard.publication/")) {
      validValues.add(
        `at://${aturi.hostname}/pub.leaflet.publication/${aturi.rkey}`,
      );
    } else if (pubUri.includes("/pub.leaflet.publication/")) {
      validValues.add(
        `at://${aturi.hostname}/site.standard.publication/${aturi.rkey}`,
      );
    }
  } catch (e) {
    // Invalid URI, just use the original
  }

  return validValues;
}

async function findIncorrectSiteValues() {
  console.log("=".repeat(60));
  console.log("Find Documents with Incorrect Site Values");
  console.log("=".repeat(60));
  console.log("\nScanning ALL documents_in_publications entries...\n");

  // Step 1: Get ALL documents_in_publications entries
  const { data: allJoinEntries, error: joinError } = await supabaseServerClient
    .from("documents_in_publications")
    .select("document, publication");

  if (joinError) {
    console.error(
      "Error fetching documents_in_publications:",
      joinError.message,
    );
    process.exit(1);
  }

  if (!allJoinEntries || allJoinEntries.length === 0) {
    console.log("No documents_in_publications entries found.");
    return;
  }

  console.log(
    `Found ${allJoinEntries.length} documents_in_publications entries\n`,
  );

  // Create a map of document URI -> expected publication URI
  const documentToPublication = new Map<string, string>();
  for (const row of allJoinEntries) {
    documentToPublication.set(row.document, row.publication);
  }

  // Step 2: Fetch all document records in batches
  const documentUris = Array.from(documentToPublication.keys());
  const BATCH_SIZE = 100;
  const allDocuments: Array<{ uri: string; data: unknown }> = [];

  for (let i = 0; i < documentUris.length; i += BATCH_SIZE) {
    const batchUris = documentUris.slice(i, i + BATCH_SIZE);

    const { data: batchDocs, error: batchError } = await supabaseServerClient
      .from("documents")
      .select("uri, data")
      .in("uri", batchUris);

    if (batchError) {
      console.error(`Error fetching documents batch: ${batchError.message}`);
      continue;
    }

    allDocuments.push(...(batchDocs || []));
    process.stdout.write(
      `\rFetched ${allDocuments.length}/${documentUris.length} documents...`,
    );
  }
  console.log("\n");

  // Step 3: Check each document's site field
  const incorrectSite: Array<{
    documentUri: string;
    actualSite: string | null;
    expectedPublication: string;
  }> = [];

  const correctSite: string[] = [];
  const missingSite: string[] = [];

  for (const doc of allDocuments) {
    const expectedPubUri = documentToPublication.get(doc.uri);
    if (!expectedPubUri) continue;

    const site = (doc.data as any)?.site;

    if (!site) {
      missingSite.push(doc.uri);
    } else {
      const validSiteValues = buildValidSiteValues(expectedPubUri);

      if (!validSiteValues.has(site)) {
        incorrectSite.push({
          documentUri: doc.uri,
          actualSite: site,
          expectedPublication: expectedPubUri,
        });
      } else {
        correctSite.push(doc.uri);
      }
    }
  }

  // Report findings
  console.log("=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));

  console.log(`\nDocuments with CORRECT site value: ${correctSite.length}`);
  console.log(`Documents with MISSING site value: ${missingSite.length}`);
  console.log(`Documents with INCORRECT site value: ${incorrectSite.length}`);

  if (missingSite.length > 0 && missingSite.length <= 20) {
    console.log("\n" + "-".repeat(60));
    console.log("DOCUMENTS MISSING SITE VALUE:");
    console.log("-".repeat(60));
    for (const uri of missingSite) {
      console.log(`  ${uri}`);
    }
  } else if (missingSite.length > 20) {
    console.log(
      `\n(${missingSite.length} documents missing site value - showing first 20)`,
    );
    for (const uri of missingSite.slice(0, 20)) {
      console.log(`  ${uri}`);
    }
  }

  if (incorrectSite.length > 0) {
    console.log("\n" + "-".repeat(60));
    console.log("DOCUMENTS WITH INCORRECT SITE VALUE:");
    console.log("-".repeat(60));
    for (const doc of incorrectSite) {
      console.log(`\n  Document: ${doc.documentUri}`);
      console.log(`    Actual site:          ${doc.actualSite}`);
      console.log(`    Expected publication: ${doc.expectedPublication}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(
    `Total documents_in_publications entries: ${allJoinEntries.length}`,
  );
  console.log(`Documents fetched: ${allDocuments.length}`);
  console.log(`Correct: ${correctSite.length}`);
  console.log(`Missing site: ${missingSite.length}`);
  console.log(`Incorrect site: ${incorrectSite.length}`);

  // Return the incorrect documents as JSON for easy parsing
  if (incorrectSite.length > 0) {
    console.log("\n" + "-".repeat(60));
    console.log("INCORRECT DOCUMENTS (JSON):");
    console.log("-".repeat(60));
    console.log(JSON.stringify(incorrectSite, null, 2));
  }
}

findIncorrectSiteValues().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
