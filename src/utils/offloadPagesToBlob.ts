import { BlobRef } from "@atproto/lexicon";
import type { AtpBaseClient, SiteStandardDocument } from "lexicons/api";

const CONTENT_BLOB_THRESHOLD = 100 * 1024;

// Walks an arbitrary value and returns every BlobRef instance reachable from
// it. Used to hoist image/etc. blob refs out of pages content so they remain
// referenced by the record after pages are offloaded to a JSON blob — the PDS
// only scans the record itself for blob references when deciding what to
// garbage-collect.
function collectBlobRefs(value: unknown): BlobRef[] {
  const out: BlobRef[] = [];
  const visit = (v: unknown) => {
    if (v instanceof BlobRef) {
      out.push(v);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item);
      return;
    }
    if (v && typeof v === "object") {
      for (const item of Object.values(v)) visit(item);
    }
  };
  visit(value);
  return out;
}

// If the record's inline pages would push it past the PDS's per-record size
// limits, offload them to a JSON blob and reference it via blobPages. Returns
// the record unchanged if it's already offloaded (content.blobPages is set) or
// if inline pages fit under the threshold.
//
// Any caller that round-trips a SiteStandardDocument.Record through
// putRecord — including post-publish updates like attaching bskyPostRef —
// MUST run the record through this helper first, otherwise large docs will
// 413 against the PDS even though the original publish offloaded successfully.
export async function maybeOffloadPagesToBlob(
  record: SiteStandardDocument.Record,
  agent: AtpBaseClient,
): Promise<SiteStandardDocument.Record> {
  const content = record.content as Record<string, unknown> | undefined;
  if (!content) return record;

  if (content.blobPages) return record;

  const pages = content.pages;
  if (!Array.isArray(pages) || pages.length === 0) return record;

  const inlinePagesJson = JSON.stringify(pages);
  const inlinePagesBytes = Buffer.byteLength(inlinePagesJson, "utf8");
  if (inlinePagesBytes <= CONTENT_BLOB_THRESHOLD) return record;

  const pagesBlob = await agent.com.atproto.repo.uploadBlob(
    new Blob([inlinePagesJson], { type: "application/json" }),
    { headers: { "Content-Type": "application/json" } },
  );
  const referencedBlobs = collectBlobRefs(pages);
  return {
    ...record,
    content: {
      $type: "pub.leaflet.content" as const,
      pages: [],
      blobPages: pagesBlob.data.blob,
      ...(referencedBlobs.length > 0 && { blobs: referencedBlobs }),
    },
  };
}
