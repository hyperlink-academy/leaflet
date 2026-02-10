import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "supabase/database.types";
import { AtUri } from "@atproto/syntax";
import { AtpAgent } from "@atproto/api";
import { DidResolver } from "@atproto/identity";
import {
  SiteStandardDocument,
  SiteStandardPublication,
  SiteStandardGraphSubscription,
} from "lexicons/api";
import { ids } from "lexicons/api/lexicons";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const RELAY_HOST =
  process.env.RELAY_HOST || "https://relay1.us-west.bsky.network";

// Publications and documents are processed first, then subscriptions separately
// (since subscriptions reference publications)
const PUBLICATION_COLLECTIONS = [
  ids.SiteStandardPublication,
  ids.SiteStandardDocument,
] as const;

const SUBSCRIPTION_COLLECTIONS = [
  ids.SiteStandardGraphSubscription,
] as const;

const ALL_COLLECTIONS = [
  ...PUBLICATION_COLLECTIONS,
  ...SUBSCRIPTION_COLLECTIONS,
] as const;

// Statistics tracking
const stats = {
  reposDiscovered: 0,
  reposProcessed: 0,
  reposFailed: 0,
  recordsProcessed: 0,
  recordsFailed: 0,
  recordsSkipped: 0,
  documentsUpserted: 0,
  publicationsUpserted: 0,
  subscriptionsUpserted: 0,
  httpErrors: 0,
  rateLimitHits: 0,
  startTime: Date.now(),
};

// Concurrency limit for parallel processing
const CONCURRENCY_LIMIT = 5;

// Backoff configuration
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;
const MAX_RETRIES = 5;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<T | null> {
  let backoff = INITIAL_BACKOFF_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const isRateLimit = status === 429;
      const isServerError = status >= 500;
      const isRetryable = isRateLimit || isServerError;

      if (isRateLimit) {
        stats.rateLimitHits++;
        // Check for Retry-After header
        const retryAfter = err?.headers?.["retry-after"];
        if (retryAfter) {
          backoff = parseInt(retryAfter, 10) * 1000;
        }
      }

      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(
          `[retry] ${context} - attempt ${attempt}/${MAX_RETRIES}, ` +
            `status=${status}, waiting ${backoff}ms`,
        );
        await sleep(backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      } else {
        stats.httpErrors++;
        console.error(
          `[error] ${context} - failed after ${attempt} attempts:`,
          err?.message || err,
        );
        return null;
      }
    }
  }
  return null;
}

async function fetchReposByCollection(
  agent: AtpAgent,
  collection: string,
): Promise<string[]> {
  const dids: string[] = [];
  let cursor: string | undefined;

  console.log(`\nFetching repos with collection: ${collection}`);

  do {
    const response = await withRetry(
      () =>
        agent.com.atproto.sync.listReposByCollection({
          collection,
          limit: 1000,
          cursor,
        }),
      `listReposByCollection(${collection})`,
    );

    if (!response) break;

    for (const repo of response.data.repos) {
      dids.push(repo.did);
    }

    cursor = response.data.cursor;
    process.stdout.write(`\r  Found ${dids.length} repos...`);
  } while (cursor);

  console.log(`\r  Found ${dids.length} repos total`);
  return dids;
}

async function fetchAllRepos(): Promise<string[]> {
  const agent = new AtpAgent({ service: RELAY_HOST });
  const allDids = new Set<string>();

  for (const collection of ALL_COLLECTIONS) {
    const dids = await fetchReposByCollection(agent, collection);
    for (const did of dids) {
      allDids.add(did);
    }
  }

  stats.reposDiscovered = allDids.size;
  return Array.from(allDids);
}

async function resolveDidToService(
  didResolver: DidResolver,
  did: string,
): Promise<string | null> {
  const result = await withRetry(
    () => didResolver.resolve(did),
    `resolveDidToService(${did})`,
  );

  if (!result) return null;

  const service = result.service?.find(
    (s) => s.id === "#atproto_pds" || s.id === `${did}#atproto_pds`,
  );

  if (!service) {
    console.warn(`[warn] No PDS service found for ${did}`);
    return null;
  }

  return service.serviceEndpoint as string;
}

async function getExistingUrisForCollection(
  did: string,
  collection: string,
): Promise<Set<string>> {
  const existingUris = new Set<string>();

  // Query the appropriate table based on collection type
  if (collection === ids.SiteStandardDocument) {
    const { data } = await supabase
      .from("documents")
      .select("uri")
      .like("uri", `at://${did}/${collection}/%`);
    if (data) {
      for (const row of data) {
        existingUris.add(row.uri);
      }
    }
  } else if (collection === ids.SiteStandardPublication) {
    const { data } = await supabase
      .from("publications")
      .select("uri")
      .like("uri", `at://${did}/${collection}/%`);
    if (data) {
      for (const row of data) {
        existingUris.add(row.uri);
      }
    }
  } else if (collection === ids.SiteStandardGraphSubscription) {
    const { data } = await supabase
      .from("publication_subscriptions")
      .select("uri")
      .like("uri", `at://${did}/${collection}/%`);
    if (data) {
      for (const row of data) {
        existingUris.add(row.uri);
      }
    }
  }

  return existingUris;
}

async function listRecordsForCollection(
  agent: AtpAgent,
  repo: string,
  collection: string,
): Promise<Array<{ uri: string; value: unknown }>> {
  const records: Array<{ uri: string; value: unknown }> = [];
  let cursor: string | undefined;

  do {
    const response = await withRetry(
      () =>
        agent.com.atproto.repo.listRecords({
          repo,
          collection,
          limit: 100,
          cursor,
        }),
      `listRecords(${repo}, ${collection})`,
    );

    if (!response) break;

    for (const record of response.data.records) {
      records.push({ uri: record.uri, value: record.value });
    }

    cursor = response.data.cursor;
  } while (cursor);

  return records;
}

function tryValidateWithPropertyRemoval<T>(
  value: unknown,
  validateFn: (v: unknown) => { success: true; value: T } | { success: false; error: unknown },
  uri: string,
): { success: true; value: T } | { success: false; error: unknown } {
  let record = validateFn(value);

  if (!record.success) {
    const errorStr = String(record.error);
    // Match nested paths like Record/property1/property2 - just grab the first property
    const match = errorStr.match(/Record\/(\w+)[\w/]* must be an object which includes the "\$type" property/);

    if (match && typeof value === "object" && value !== null) {
      const propertyName = match[1];
      console.warn(`[fix] Removing property "${propertyName}" from ${uri} due to missing $type`);

      const cleanedValue = { ...value } as Record<string, unknown>;
      delete cleanedValue[propertyName];

      record = validateFn(cleanedValue);
    }
  }

  return record;
}

async function processDocument(
  uri: string,
  value: unknown,
  did: string,
): Promise<boolean> {
  const record = tryValidateWithPropertyRemoval(
    value,
    SiteStandardDocument.validateRecord,
    uri,
  );
  if (!record.success) {
    console.error(`[invalid] Document ${uri}:`, record.error);
    return false;
  }

  await supabase
    .from("identities")
    .upsert({ atp_did: did }, { onConflict: "atp_did" });

  // Write to main documents table
  const docResult = await supabase.from("documents").upsert({
    uri,
    data: record.value as Json,
  });

  if (docResult.error) {
    console.error(`[db-error] Document ${uri}:`, docResult.error);
    return false;
  }

  // site.standard.document uses "site" field to reference the publication
  // Only link to publications table for AT-URI sites
  if (record.value.site && record.value.site.startsWith("at://")) {
    const siteURI = new AtUri(record.value.site);
    if (siteURI.host !== did) {
      console.warn(`[warn] Unauthorized site reference in document: ${uri}`);
      return true; // Still count as processed
    }

    const docInPubResult = await supabase
      .from("documents_in_publications")
      .upsert({
        publication: record.value.site,
        document: uri,
      });

    if (docInPubResult.error) {
      console.error(
        `[db-error] Doc in publication ${uri}:`,
        docInPubResult.error,
      );
    }
  }

  stats.documentsUpserted++;
  return true;
}

async function processPublication(
  uri: string,
  value: unknown,
  did: string,
): Promise<boolean> {
  const record = tryValidateWithPropertyRemoval(
    value,
    SiteStandardPublication.validateRecord,
    uri,
  );
  if (!record.success) {
    console.error(`[invalid] Publication ${uri}:`, record.error);
    return false;
  }

  await supabase
    .from("identities")
    .upsert({ atp_did: did }, { onConflict: "atp_did" });

  // Write to main publications table
  const pubResult = await supabase.from("publications").upsert({
    uri,
    identity_did: did,
    name: record.value.name,
    record: record.value as Json,
  });

  if (pubResult.error) {
    console.error(`[db-error] Publication ${uri}:`, pubResult.error);
    return false;
  }

  stats.publicationsUpserted++;
  return true;
}

async function processSubscription(
  uri: string,
  value: unknown,
  did: string,
): Promise<boolean> {
  const record = tryValidateWithPropertyRemoval(
    value,
    SiteStandardGraphSubscription.validateRecord,
    uri,
  );
  if (!record.success) {
    console.error(`[invalid] Subscription ${uri}:`, record.error);
    return false;
  }

  await supabase
    .from("identities")
    .upsert({ atp_did: did }, { onConflict: "atp_did" });

  // Write to main publication_subscriptions table
  const subResult = await supabase.from("publication_subscriptions").upsert({
    uri,
    identity: did,
    publication: record.value.publication,
    record: record.value as Json,
  });

  if (subResult.error) {
    console.error(`[db-error] Subscription ${uri}:`, subResult.error);
    return false;
  }

  stats.subscriptionsUpserted++;
  return true;
}

async function processRepo(
  did: string,
  didResolver: DidResolver,
  collections: readonly string[],
): Promise<void> {
  // Check which records already exist in the database for each collection
  const existingUris: Map<string, Set<string>> = new Map();
  for (const collection of collections) {
    const uris = await getExistingUrisForCollection(did, collection);
    existingUris.set(collection, uris);
  }

  // Resolve DID to PDS service endpoint
  const serviceEndpoint = await resolveDidToService(didResolver, did);
  if (!serviceEndpoint) {
    stats.reposFailed++;
    return;
  }

  const agent = new AtpAgent({ service: serviceEndpoint });

  let repoRecordsProcessed = 0;
  let repoRecordsFailed = 0;
  let repoRecordsSkipped = 0;

  for (const collection of collections) {
    const collectionExistingUris = existingUris.get(collection) || new Set();
    const records = await listRecordsForCollection(agent, did, collection);

    for (const { uri, value } of records) {
      // Skip if record already exists in the database
      if (collectionExistingUris.has(uri)) {
        repoRecordsSkipped++;
        stats.recordsSkipped++;
        continue;
      }

      let success = false;

      if (collection === ids.SiteStandardDocument) {
        success = await processDocument(uri, value, did);
      } else if (collection === ids.SiteStandardPublication) {
        success = await processPublication(uri, value, did);
      } else if (collection === ids.SiteStandardGraphSubscription) {
        success = await processSubscription(uri, value, did);
      }

      if (success) {
        repoRecordsProcessed++;
        stats.recordsProcessed++;
      } else {
        repoRecordsFailed++;
        stats.recordsFailed++;
      }
    }
  }

  console.log(
    `[repo] ${did}: ${repoRecordsProcessed} processed, ${repoRecordsSkipped} skipped, ${repoRecordsFailed} failed`,
  );
}

function printStats(): void {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);

  console.log("\n" + "=".repeat(60));
  console.log("BACKFILL SUMMARY");
  console.log("=".repeat(60));
  console.log(`Duration: ${minutes}m ${seconds}s`);
  console.log("");
  console.log("Repositories:");
  console.log(`  Discovered:  ${stats.reposDiscovered}`);
  console.log(`  Processed:   ${stats.reposProcessed}`);
  console.log(`  Failed:      ${stats.reposFailed}`);
  console.log("");
  console.log("Records:");
  console.log(`  Processed:   ${stats.recordsProcessed}`);
  console.log(`  Skipped:     ${stats.recordsSkipped}`);
  console.log(`  Failed:      ${stats.recordsFailed}`);
  console.log("");
  console.log("Upserted:");
  console.log(`  Documents:     ${stats.documentsUpserted}`);
  console.log(`  Publications:  ${stats.publicationsUpserted}`);
  console.log(`  Subscriptions: ${stats.subscriptionsUpserted}`);
  console.log("");
  console.log("Errors:");
  console.log(`  HTTP errors:     ${stats.httpErrors}`);
  console.log(`  Rate limit hits: ${stats.rateLimitHits}`);
  console.log("=".repeat(60));
}

async function processReposInParallel(
  dids: string[],
  didResolver: DidResolver,
  collections: readonly string[],
  phase: string,
): Promise<void> {
  let completed = 0;

  async function processWithTracking(did: string): Promise<void> {
    try {
      await processRepo(did, didResolver, collections);
      stats.reposProcessed++;
    } catch (err) {
      console.error(`[error] Unexpected error processing ${did}:`, err);
      stats.reposFailed++;
    }
    completed++;
    if (completed % 10 === 0 || completed === dids.length) {
      console.log(`[${phase}] Progress: ${completed}/${dids.length} repos`);
    }
  }

  // Process in batches with concurrency limit
  const queue = [...dids];
  const active: Promise<void>[] = [];

  while (queue.length > 0 || active.length > 0) {
    // Fill up to concurrency limit
    while (active.length < CONCURRENCY_LIMIT && queue.length > 0) {
      const did = queue.shift()!;
      const promise = processWithTracking(did).then(() => {
        const index = active.indexOf(promise);
        if (index > -1) active.splice(index, 1);
      });
      active.push(promise);
    }

    // Wait for at least one to complete before continuing
    if (active.length > 0) {
      await Promise.race(active);
    }
  }
}

async function backfill(dids: string[]): Promise<void> {
  if (dids.length === 0) {
    console.log("No repos found with site.standard collections.");
    return;
  }

  const didResolver = new DidResolver({});

  // First pass: process publications and documents
  console.log(`\n${"=".repeat(60)}`);
  console.log("PHASE 1: Processing publications and documents");
  console.log(`${"=".repeat(60)}`);
  console.log(`Processing ${dids.length} repositories (concurrency: ${CONCURRENCY_LIMIT})...`);

  await processReposInParallel(dids, didResolver, PUBLICATION_COLLECTIONS, "phase1");

  // Second pass: process subscriptions (which reference publications)
  console.log(`\n${"=".repeat(60)}`);
  console.log("PHASE 2: Processing subscriptions");
  console.log(`${"=".repeat(60)}`);
  console.log(`Processing ${dids.length} repositories (concurrency: ${CONCURRENCY_LIMIT})...`);

  await processReposInParallel(dids, didResolver, SUBSCRIPTION_COLLECTIONS, "phase2");
}

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("site.standard Backfill Script");
  console.log("=".repeat(60));

  // Check for manual DID arguments
  const manualDids = process.argv.slice(2);

  let dids: string[];

  if (manualDids.length > 0) {
    console.log(`\nUsing ${manualDids.length} manually specified DID(s)`);
    dids = manualDids;
    stats.reposDiscovered = dids.length;
  } else {
    console.log(`\nDiscovering repos from relay: ${RELAY_HOST}`);
    console.log("Collections:");
    for (const col of ALL_COLLECTIONS) {
      console.log(`  - ${col}`);
    }
    dids = await fetchAllRepos();
    console.log(`\nDiscovered ${dids.length} unique repositories`);
  }

  await backfill(dids);
  printStats();

  const exitCode = stats.reposFailed > 0 || stats.recordsFailed > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  printStats();
  process.exit(1);
});
