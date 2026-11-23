import { jsonToLex, lexToJson } from "@atproto/lexicon";
import type { AtpBaseClient } from "lexicons/api";
import { truncateDocumentRecordForPDS } from "src/membership";
import { maybeOffloadPagesToBlob } from "src/utils/offloadPagesToBlob";
import { resolveBlobLinks, type JsonBlob } from "src/utils/resolveBlobLinks";

export async function uploadBlobFromUrl(
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

// Members-only images live in Leaflet storage and are carried as
// `{ ref: { $link: "https://…" } }` refs (makePublishUploadHooks). Posts
// published before those refs carried `$type: "blob"` lack it, which
// resolveBlobLinks needs to recognise them.
function markLinkBlobs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(markLinkBlobs);
  if (!value || typeof value !== "object") return value;
  const v = value as Record<string, unknown>;
  const link = (v.ref as { $link?: unknown } | undefined)?.$link;
  if (
    typeof link === "string" &&
    /^https?:\/\//.test(link) &&
    typeof v.mimeType === "string"
  )
    return { ...v, $type: "blob" };
  return Object.fromEntries(
    Object.entries(v).map(([k, item]) => [k, markLinkBlobs(item)]),
  );
}

// The copy of a document record that may go to its PDS. Every path that
// writes a document record to a PDS must pass it through here first:
// - a gated post is cut off at the members-only delimiter;
// - a post whose early access ended with a public wider release keeps its full
//   content, so its members-only images, until now only in Leaflet storage,
//   are uploaded to the PDS for the record to reference;
// - a site.standard.document too large to inline has its pages offloaded.
// Accepts either lex values (BlobRef instances) or their JSON form, as read
// back from our documents table.
export async function documentRecordForPDS<T extends { $type: string }>(
  record: T,
  agent: AtpBaseClient,
): Promise<T> {
  const json = markLinkBlobs(lexToJson(truncateDocumentRecordForPDS(record)));
  const { record: resolved } = await resolveBlobLinks(json, (url) =>
    uploadBlobFromUrl(agent, url),
  );
  const forPds = jsonToLex(resolved as Parameters<typeof jsonToLex>[0]) as T;
  if (forPds.$type !== "site.standard.document") return forPds;
  return (await maybeOffloadPagesToBlob(
    forPds as unknown as Parameters<typeof maybeOffloadPagesToBlob>[0],
    agent,
  )) as unknown as T;
}
