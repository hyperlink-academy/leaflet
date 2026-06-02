import { BlobRef } from "@atproto/lexicon";

// `baseUrl` produces an absolute URL (needed for outbound email where the proxy
// path can't resolve against the document origin).
//
// If `$link` is already an http(s) URL we return it untouched — the email-preview
// path stuffs a direct draft-image URL into `$link` since drafts aren't uploaded
// to a PDS yet.
// `transform` requests a downscaled version of the image via Supabase's image
// transformation pipeline (handled in /api/atproto_images). Use it for
// thumbnails so we don't ship the full-resolution blob to render a small image.
export const blobRefToSrc = (
  b: BlobRef["ref"],
  did: string,
  baseUrl?: string,
  transform?: { width?: number; height?: number },
) => {
  const link = (b as unknown as { $link: string })["$link"];
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  const prefix = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  let src = `${prefix}/api/atproto_images?did=${did}&cid=${link}`;
  if (transform?.width) src += `&width=${transform.width}`;
  if (transform?.height) src += `&height=${transform.height}`;
  return src;
};

// Display widths (px) for cover-image thumbnails, used to request a right-sized
// transform instead of shipping the full-resolution blob.
export const COVER_THUMBNAIL_WIDTH = { large: 800, medium: 360 };

// Width (px) to request for inline post content images. Generous enough for
// retina at the widest page layouts; the transform never upscales past source
// (callers cap by the image's intrinsic width).
export const POST_IMAGE_WIDTH = 1600;

// Link/website preview images render as a small (~120px) thumbnail.
export const LINK_PREVIEW_IMAGE_WIDTH = 240;
