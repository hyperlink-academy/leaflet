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
// `format: "email"` transcodes away formats mail clients can't display; pass it
// for anything rendered into an outgoing email.
// The CID inside a blob ref (or the raw storage URL for draft images): a
// stable identity for an image, independent of which display transform its
// src was built with.
export const blobRefCid = (b: BlobRef["ref"]) =>
  (b as unknown as { $link: string })["$link"];

export const blobRefToSrc = (
  b: BlobRef["ref"],
  did: string,
  baseUrl?: string,
  transform?: { width?: number; height?: number; format?: "email" },
) => {
  const link = blobRefCid(b);
  const prefix = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  if (link.startsWith("http://") || link.startsWith("https://")) {
    // A draft image, still living in storage rather than on a PDS. It needs
    // the same transcode, which the storage-side proxy provides.
    const path = transform?.format && storagePathFromPublicUrl(link);
    if (!path) return link;
    let src = `${prefix}/api/resized_images?path=${encodeURIComponent(path)}&format=${transform.format}`;
    if (transform.width) src += `&width=${transform.width}`;
    return src;
  }
  let src = `${prefix}/api/atproto_images?did=${did}&cid=${link}`;
  if (transform?.width) src += `&width=${transform.width}`;
  if (transform?.height) src += `&height=${transform.height}`;
  if (transform?.format) src += `&format=${transform.format}`;
  src += "&v=1";
  return src;
};

const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";

// The bucket-and-path /api/resized_images expects, or undefined when the URL
// doesn't point at our storage (nothing we can transcode).
const storagePathFromPublicUrl = (url: string) => {
  const marker = url.indexOf(STORAGE_PUBLIC_PREFIX);
  if (marker === -1) return undefined;
  const path = url.slice(marker + STORAGE_PUBLIC_PREFIX.length).split("?")[0];
  return path || undefined;
};

// Display widths (px) for cover-image thumbnails, used to request a right-sized
// transform instead of shipping the full-resolution blob.
export const COVER_THUMBNAIL_WIDTH = { large: 800, medium: 360 };

// Display width for images rendered inline in a post body: the ~600px content
// column at retina density (see the ladder in supabase/imageSizes.js).
// Lightboxes load the untransformed blob instead.
export const POST_BODY_IMAGE_WIDTH = 1200;

// Shared transform for publication icons rendered into emails.
export const EMAIL_ICON_TRANSFORM = { width: 360, format: "email" } as const;
