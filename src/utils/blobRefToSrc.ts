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

// A `srcset` built from ladder widths only (supabase/imageSizes.js), so every
// candidate the browser can request is one the resize routes already produce
// (or snap to) rather than minting a new stored variant per caller.
export const blobRefToSrcSet = (
  b: BlobRef["ref"],
  did: string,
  widths: number[],
) =>
  widths
    .map((width) => `${blobRefToSrc(b, did, undefined, { width })} ${width}w`)
    .join(", ");

// Ladder widths to offer for cover-image srcsets: large enough for the box at
// 2x density, small enough that a narrow viewport doesn't pull the 800 candidate.
export const COVER_SRCSET_WIDTHS = [
  COVER_THUMBNAIL_WIDTH.medium,
  COVER_THUMBNAIL_WIDTH.large,
];

// `sizes` for cover-image thumbnails, matched to each variant's CSS box.
export const COVER_SIZES = {
  // PublicationPostItemLarge: a fixed 254px-tall/3:2 box (~381px wide) once a
  // page opts into the wide row layout at sm+, otherwise the full content
  // column — 624px is the default --page-width-units (ThemeProvider.tsx).
  large: "(min-width: 640px) 624px, 100vw",
  // PublicationPostItemMedium: fixed w-24/sm:w-36 square box.
  medium: "(min-width: 640px) 144px, 96px",
};

// `sizes` for post-body images: the ~600px content column
// (postContent's sm:max-w-(--page-width-units), default 624px, minus padding).
export const POST_BODY_SIZES = "(min-width: 640px) 600px, 100vw";
