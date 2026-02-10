import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { AtpAgent } from "@atproto/api";
import { IdResolver } from "@atproto/identity";

/**
 * Backfill bsky_like_count for documents that have a Bluesky post reference.
 *
 * Queries for documents with either:
 *   - data->bskyPostRef->uri (site.standard.document)
 *   - data->postRef->uri (pub.leaflet.document)
 *
 * Then fetches the like count from the Bluesky public API and updates
 * the bsky_like_count column. Skips brid.gy accounts.
 *
 * Usage:
 *   npx tsx scripts/backfill-bsky-like-counts.ts
 *   npx tsx scripts/backfill-bsky-like-counts.ts --dry-run
 */

const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
const idResolver = new IdResolver();

// Bluesky getPosts accepts max 25 URIs per request
const BATCH_SIZE = 25;

interface DocWithPostRef {
  uri: string;
  bsky_post_uri: string;
}

async function fetchDocumentsWithPostRefs(): Promise<DocWithPostRef[]> {
  const docs: DocWithPostRef[] = [];

  // Fetch site.standard.document records with bskyPostRef
  const { data: standardDocs, error: err1 } = await supabase
    .from("documents")
    .select("uri, data")
    .not("data->bskyPostRef->uri", "is", null);

  if (err1) {
    console.error("Error fetching standard docs:", err1.message);
  } else if (standardDocs) {
    for (const doc of standardDocs) {
      const data = doc.data as Record<string, any>;
      const bskyUri = data.bskyPostRef?.uri;
      if (bskyUri) docs.push({ uri: doc.uri, bsky_post_uri: bskyUri });
    }
  }

  // Fetch pub.leaflet.document records with postRef
  const { data: leafletDocs, error: err2 } = await supabase
    .from("documents")
    .select("uri, data")
    .not("data->postRef->uri", "is", null)
    .is("data->bskyPostRef->uri" as any, null); // avoid duplicates

  if (err2) {
    console.error("Error fetching leaflet docs:", err2.message);
  } else if (leafletDocs) {
    for (const doc of leafletDocs) {
      const data = doc.data as Record<string, any>;
      const bskyUri = data.postRef?.uri;
      if (bskyUri) docs.push({ uri: doc.uri, bsky_post_uri: bskyUri });
    }
  }

  return docs;
}

async function resolveHandle(did: string): Promise<string | null> {
  try {
    const doc = await idResolver.did.resolve(did);
    return (
      doc?.alsoKnownAs
        ?.find((a) => a.startsWith("at://"))
        ?.replace("at://", "") ?? null
    );
  } catch {
    return null;
  }
}

async function backfill() {
  console.log("Fetching documents with Bluesky post references...\n");
  const docs = await fetchDocumentsWithPostRefs();

  if (docs.length === 0) {
    console.log("No documents found with Bluesky post references.");
    return;
  }

  console.log(`Found ${docs.length} documents with post refs.`);
  if (DRY_RUN) console.log("(dry run — no updates will be written)\n");

  // Extract unique DIDs from bsky post URIs and check for brid.gy
  const didSet = new Set(docs.map((d) => d.bsky_post_uri.split("/")[2]));
  console.log(`Resolving ${didSet.size} unique DIDs to check for brid.gy...\n`);

  const bridgyDids = new Set<string>();
  for (const did of didSet) {
    const handle = await resolveHandle(did);
    if (handle?.includes("brid.gy")) {
      bridgyDids.add(did);
      console.log(`  Skipping brid.gy account: ${did} (${handle})`);
    }
  }

  const filteredDocs = docs.filter((d) => {
    const did = d.bsky_post_uri.split("/")[2];
    return !bridgyDids.has(did);
  });

  const skippedCount = docs.length - filteredDocs.length;
  if (skippedCount > 0) {
    console.log(`\nSkipping ${skippedCount} documents from brid.gy accounts.`);
  }
  console.log(`Processing ${filteredDocs.length} documents...\n`);

  let updated = 0;
  let failed = 0;
  let noPost = 0;

  // Batch the bsky post URI lookups
  for (let i = 0; i < filteredDocs.length; i += BATCH_SIZE) {
    const batch = filteredDocs.slice(i, i + BATCH_SIZE);
    const batchUris = batch.map((d) => d.bsky_post_uri);

    try {
      const res = await agent.app.bsky.feed.getPosts({ uris: batchUris });
      const postsByUri = new Map(
        res.data.posts.map((p) => [p.uri, p]),
      );

      for (const doc of batch) {
        const post = postsByUri.get(doc.bsky_post_uri);
        if (!post) {
          noPost++;
          console.log(`  [missing] ${doc.uri} -> post not found: ${doc.bsky_post_uri}`);
          continue;
        }

        const likeCount = post.likeCount ?? 0;
        console.log(`  [update] ${doc.uri} -> ${likeCount} likes`);

        if (!DRY_RUN) {
          const { error } = await supabase
            .from("documents")
            .update({ bsky_like_count: likeCount })
            .eq("uri", doc.uri);

          if (error) {
            console.error(`  [error] Failed to update ${doc.uri}:`, error.message);
            failed++;
            continue;
          }
        }

        updated++;
      }
    } catch (err: any) {
      console.error(`  [error] getPosts batch failed:`, err?.message || err);
      failed += batch.length;
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < filteredDocs.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("BACKFILL COMPLETE");
  console.log("=".repeat(50));
  console.log(`  Total found:    ${docs.length}`);
  console.log(`  Skipped bridgy: ${skippedCount}`);
  console.log(`  Updated:        ${updated}`);
  console.log(`  Missing posts:  ${noPost}`);
  console.log(`  Failed:         ${failed}`);
  if (DRY_RUN) console.log("\n  (dry run — no changes were made)");
}

backfill().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
