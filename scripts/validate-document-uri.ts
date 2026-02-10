import { supabaseServerClient } from "supabase/serverClient";
import { jsonToLex } from "@atproto/lexicon";
import { AtUri } from "@atproto/syntax";
import {
  PubLeafletDocument,
  SiteStandardDocument,
} from "lexicons/api";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";

/**
 * Validates a pub.leaflet.document record from the database and shows
 * what it would look like when migrated to site.standard.document.
 *
 * Usage: npx ts-node scripts/validate-document-uri.ts <at-uri>
 */
async function validateDocumentUri() {
  const uri = process.argv[2];

  if (!uri) {
    console.error("Usage: npx ts-node scripts/validate-document-uri.ts <at-uri>");
    console.error("Example: npx ts-node scripts/validate-document-uri.ts at://did:plc:xxx/pub.leaflet.document/abc123");
    process.exit(1);
  }

  if (!uri.startsWith("at://")) {
    console.error("Error: URI must start with 'at://'");
    process.exit(1);
  }

  if (!uri.includes("/pub.leaflet.document/")) {
    console.error("Error: URI must be for a pub.leaflet.document record");
    process.exit(1);
  }

  const aturi = new AtUri(uri);
  const did = aturi.hostname;
  const rkey = aturi.rkey;

  console.log(`Looking up document: ${uri}`);
  console.log(`  DID: ${did}`);
  console.log(`  rkey: ${rkey}\n`);

  // Fetch document and publication association in parallel
  const [docResult, pubAssocResult] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("uri, data, indexed_at")
      .eq("uri", uri)
      .single(),
    supabaseServerClient
      .from("documents_in_publications")
      .select("publication")
      .eq("document", uri)
      .single(),
  ]);

  if (docResult.error) {
    console.error("Database error:", docResult.error.message);
    process.exit(1);
  }

  const doc = docResult.data;
  if (!doc) {
    console.error("Document not found in database");
    process.exit(1);
  }

  const oldPubUri = pubAssocResult.data?.publication || null;

  console.log("Document found in database:");
  console.log(`  URI: ${doc.uri}`);
  console.log(`  Indexed at: ${doc.indexed_at}`);
  console.log(`  Publication: ${oldPubUri || "(standalone)"}`);
  console.log("\nRaw record data:");
  console.log(JSON.stringify(doc.data, null, 2));

  // Step 1: Validate as pub.leaflet.document
  console.log("\n" + "=".repeat(60));
  console.log("pub.leaflet.document validation:");
  console.log("=".repeat(60) + "\n");

  const data = jsonToLex(doc.data);
  const leafletResult = PubLeafletDocument.validateRecord(data);

  if (leafletResult.success) {
    console.log("✓ pub.leaflet.document validation PASSED\n");
  } else {
    console.log("✗ pub.leaflet.document validation FAILED\n");
    console.log("Error:");
    console.log(leafletResult.error);
  }

  // Step 2: Normalize the document (same as migration script)
  console.log("\n" + "=".repeat(60));
  console.log("Normalization:");
  console.log("=".repeat(60) + "\n");

  const normalized = normalizeDocumentRecord(doc.data, doc.uri);

  if (!normalized) {
    console.log("✗ Failed to normalize document record");
    process.exit(1);
  }

  console.log("✓ Normalization succeeded\n");
  console.log("Normalized document:");
  console.log(JSON.stringify(normalized, null, 2));

  // Step 3: Build site.standard.document record (exactly like migration script)
  console.log("\n" + "=".repeat(60));
  console.log("site.standard.document conversion:");
  console.log("=".repeat(60) + "\n");

  // Determine the site field (same logic as migration script)
  let siteValue: string;
  if (oldPubUri) {
    // Check if we should use the new publication URI
    const oldPubAturi = new AtUri(oldPubUri);
    if (oldPubAturi.collection === "pub.leaflet.publication") {
      // Convert to site.standard.publication URI
      siteValue = `at://${oldPubAturi.hostname}/site.standard.publication/${oldPubAturi.rkey}`;
      console.log(`Publication URI will be migrated:`);
      console.log(`  Old: ${oldPubUri}`);
      console.log(`  New: ${siteValue}\n`);
    } else {
      siteValue = oldPubUri;
    }
  } else {
    // Standalone document - use HTTPS URL format
    siteValue = `https://leaflet.pub/p/${did}`;
  }

  // Build the record exactly as the migration script does
  const newRecord: SiteStandardDocument.Record = {
    $type: "site.standard.document",
    title: normalized.title || "Untitled",
    site: siteValue,
    path: "/" + rkey,
    publishedAt: normalized.publishedAt || new Date().toISOString(),
    description: normalized.description,
    content: normalized.content,
    tags: normalized.tags,
    coverImage: normalized.coverImage,
    bskyPostRef: normalized.bskyPostRef,
  };

  console.log("Generated site.standard.document record:");
  console.log(JSON.stringify(newRecord, null, 2));

  // Step 4: Validate as site.standard.document
  console.log("\n" + "=".repeat(60));
  console.log("site.standard.document validation:");
  console.log("=".repeat(60) + "\n");

  // Convert to lexicon types (handles BlobRef conversion)
  const newRecordLex = jsonToLex(newRecord);
  const standardResult = SiteStandardDocument.validateRecord(newRecordLex);

  if (standardResult.success) {
    console.log("✓ site.standard.document validation PASSED\n");
    console.log("Validated record:");
    console.log(JSON.stringify(standardResult.value, null, 2));
  } else {
    console.log("✗ site.standard.document validation FAILED\n");
    console.log("Error:");
    console.log(standardResult.error);
  }
}

validateDocumentUri();
