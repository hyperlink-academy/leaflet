import { BlobRef } from "@atproto/lexicon";

// `baseUrl` produces an absolute URL (needed for outbound email where the proxy
// path can't resolve against the document origin).
//
// If `$link` is already an http(s) URL we return it untouched — the email-preview
// path stuffs a direct draft-image URL into `$link` since drafts aren't uploaded
// to a PDS yet.
export const blobRefToSrc = (
  b: BlobRef["ref"],
  did: string,
  baseUrl?: string,
) => {
  const link = (b as unknown as { $link: string })["$link"];
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  const prefix = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  return `${prefix}/api/atproto_images?did=${did}&cid=${link}`;
};
