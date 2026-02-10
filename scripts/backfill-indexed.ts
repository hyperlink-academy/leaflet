import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";
import { AtUri } from "@atproto/api";

/**
 * Backfill the `indexed` column on documents.
 * Resolves the DID for each document and sets indexed=false for brid.gy accounts.
 *
 * Usage:
 *   npx tsx scripts/backfill-indexed.ts
 *   npx tsx scripts/backfill-indexed.ts --dry-run
 */

const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 10;

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const idResolver = new IdResolver();

// Cache DID -> isBridgy so we only resolve each DID once
const didCache = new Map<string, boolean>();

async function isBridgy(did: string): Promise<boolean> {
  if (didCache.has(did)) return didCache.get(did)!;
  try {
    const doc = await idResolver.did.resolve(did);
    const handle = doc?.alsoKnownAs
      ?.find((a) => a.startsWith("at://"))
      ?.replace("at://", "");
    const result = handle?.includes("brid.gy") ?? false;
    didCache.set(did, result);
    return result;
  } catch {
    didCache.set(did, false);
    return false;
  }
}

async function fetchAllDocuments() {
  const PAGE_SIZE = 10000;
  const docs: { uri: string }[] = [];
  let cursor: string | null = null;

  while (true) {
    let query = supabase
      .from("documents")
      .select("uri")
      .order("uri")
      .limit(PAGE_SIZE);

    if (cursor) query = query.gt("uri", cursor);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching documents:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    docs.push(...data);
    cursor = data[data.length - 1].uri;

    if (data.length < PAGE_SIZE) break;
  }

  return docs;
}

async function processChunk(docs: { uri: string }[]) {
  const results = { bridgy: 0, skipped: 0, failed: 0 };

  await Promise.all(
    docs.map(async (doc) => {
      try {
        const did = new AtUri(doc.uri).host;
        const bridgy = await isBridgy(did);

        if (!bridgy) {
          results.skipped++;
          return;
        }

        console.log(`  [bridgy] ${doc.uri}`);
        results.bridgy++;

        if (!DRY_RUN) {
          const { error } = await supabase
            .from("documents")
            .update({ indexed: false })
            .eq("uri", doc.uri);

          if (error) {
            console.error(`  [error] ${doc.uri}:`, error.message);
            results.failed++;
          }
        }
      } catch (err: any) {
        console.error(`  [error] ${doc.uri}:`, err?.message || err);
        results.failed++;
      }
    }),
  );

  return results;
}

async function backfill() {
  console.log("Fetching all documents...\n");
  const docs = await fetchAllDocuments();

  if (docs.length === 0) {
    console.log("No documents found.");
    return;
  }

  console.log(`Found ${docs.length} documents.`);
  if (DRY_RUN) console.log("(dry run — no updates will be written)\n");

  let totalBridgy = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const chunk = docs.slice(i, i + CONCURRENCY);
    const results = await processChunk(chunk);

    totalBridgy += results.bridgy;
    totalSkipped += results.skipped;
    totalFailed += results.failed;

    const processed = Math.min(i + CONCURRENCY, docs.length);
    if (processed % 500 === 0 || processed === docs.length) {
      console.log(`  Progress: ${processed}/${docs.length}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("BACKFILL COMPLETE");
  console.log("=".repeat(50));
  console.log(`  Total documents: ${docs.length}`);
  console.log(`  Unique DIDs:     ${didCache.size}`);
  console.log(`  Bridgy (unindexed): ${totalBridgy}`);
  console.log(`  Already indexed:    ${totalSkipped}`);
  console.log(`  Failed:             ${totalFailed}`);
  if (DRY_RUN) console.log("\n  (dry run — no changes were made)");
}

backfill().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
