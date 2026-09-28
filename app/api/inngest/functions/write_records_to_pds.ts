import { inngest, events } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient } from "lexicons/api";
import { ids } from "lexicons/api/lexicons";
import {
  isDocumentCollection,
  isPublicationCollection,
} from "src/utils/collectionHelpers";
import { truncateDocumentRecordForPDS } from "src/membership";
import { supabaseServerClient } from "supabase/serverClient";
import { resolveBlobLinks, type JsonBlob } from "src/utils/resolveBlobLinks";
import type { Json } from "supabase/database.types";

// Batch size to avoid Inngest payload limits and PDS rate limits
const BATCH_SIZE = 50;

// Helper to create authenticated agent - must be called fresh in each step
// (OAuth sessions cannot be serialized across Inngest steps)
async function createAuthenticatedAgent(did: string): Promise<AtpBaseClient> {
  const result = await restoreOAuthSession(did);
  if (!result.ok) {
    throw new Error(`Failed to restore OAuth session: ${result.error.message}`);
  }
  return new AtpBaseClient(result.value.fetchHandler.bind(result.value));
}

// Records may name blobs by http(s) URL (see resolveBlobLinks); those are
// fetched and uploaded to the PDS before the record is written, and the
// uploaded refs are written back to our own copy of the record. Only blobs
// the PDS copy references are uploaded: a gated post's members-only images
// stay in Leaflet storage, as they do for a regular publish.
export const write_records_to_pds = inngest.createFunction(
  {
    id: "write-records-to-pds",
    triggers: [events.userWriteRecordsToPds],
  },
  async ({ event, step }) => {
    const { did, records } = event.data;

    // Step 1: Verify OAuth session is valid before proceeding
    await step.run("verify-oauth-session", async () => {
      const result = await restoreOAuthSession(did);
      if (!result.ok) {
        throw new Error(`OAuth restore failed: ${result.error.message}`);
      }
      return { success: true };
    });

    // Step 2: Write records to PDS in batches
    // Split records into batches to avoid payload limits and rate limiting
    const batches: (typeof records)[] = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    let totalWritten = 0;
    let totalBlobs = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const { written, blobs } = await step.run(
        `write-batch-${batchIndex}`,
        async () => {
          const agent = await createAuthenticatedAgent(did);
          // The same image can appear more than once (a cover that's also a
          // block), and across the records of one batch.
          const uploads = new Map<string, Promise<JsonBlob>>();
          const upload = (url: string) => {
            let p = uploads.get(url);
            if (!p) {
              p = uploadBlobFromUrl(agent, url);
              uploads.set(url, p);
            }
            return p;
          };
          let written = 0;
          let blobs = 0;
          for (const rec of batch) {
            // Restores read from our documents table, which holds the full
            // content of gated posts — the PDS copy must stay truncated.
            const forPds = isDocumentCollection(rec.collection)
              ? truncateDocumentRecordForPDS(
                  rec.record as Record<string, unknown> & { $type: string },
                )
              : (rec.record as Record<string, unknown>);
            const { record, resolved } = await resolveBlobLinks(forPds, upload);
            await agent.com.atproto.repo.putRecord({
              repo: did,
              collection: rec.collection,
              rkey: rec.rkey,
              record,
              validate: false,
            });
            written++;
            blobs += resolved;
            if (resolved > 0) {
              // The full record with the same substitutions; references
              // the PDS copy doesn't carry are left as they were.
              const { record: full } = await resolveBlobLinks(
                rec.record,
                async (url) => uploads.get(url),
              );
              await writeBackRecord(did, rec.collection, rec.rkey, full);
            }
          }
          return { written, blobs };
        },
      );
      totalWritten += written;
      totalBlobs += blobs;
    }

    return {
      success: true,
      recordsWritten: totalWritten,
      blobsUploaded: totalBlobs,
      batchCount: batches.length,
    };
  },
);

async function uploadBlobFromUrl(
  agent: AtpBaseClient,
  url: string,
): Promise<JsonBlob> {
  const res = await fetch(url);
  if (res.status !== 200)
    throw new Error(`Fetching blob ${url} failed: HTTP ${res.status}`);
  const binary = await res.blob();
  const { data } = await agent.com.atproto.repo.uploadBlob(binary, {
    headers: { "Content-Type": binary.type },
  });
  return data.blob.toJSON() as JsonBlob;
}

// Our indexed copy of a record we just changed the blob refs of. The appview
// re-indexes from the firehose too, but only for the collections it follows.
async function writeBackRecord(
  did: string,
  collection: string,
  rkey: string,
  record: unknown,
) {
  const uri = `at://${did}/${collection}/${rkey}`;
  if (isDocumentCollection(collection))
    await supabaseServerClient
      .from("documents")
      .update({ data: record as Json })
      .eq("uri", uri);
  else if (isPublicationCollection(collection))
    await supabaseServerClient
      .from("publications")
      .update({ record: record as Json })
      .eq("uri", uri);
  else if (collection === ids.PubLeafletPublicationPage)
    await supabaseServerClient
      .from("publication_pages")
      .update({ record: record as Json })
      .eq("record_uri", uri);
}
