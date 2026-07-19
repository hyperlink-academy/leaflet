import { BlobRef } from "@atproto/lexicon";
import { ensureResizedVariantCached } from "src/utils/atprotoImages";

// 302 straight to the storage-cached cover variant for a post's
// opengraph-image route. A single hop rather than bouncing through
// /api/atproto_images: og-image fetchers are the flakiest HTTP clients
// around, and a two-hop cross-origin chain is where they give up. 1200 (a
// ladder width) requests a variant sized for unfurl cards instead of the
// full-resolution blob. Returns null when no variant could be cached so
// callers can fall back to the screenshot.
export async function coverImageRedirect(did: string, ref: BlobRef["ref"]) {
  // Handle both serialized and hydrated forms of the blob ref
  const cid = (ref as unknown as { $link: string })["$link"] || ref.toString();
  const url = await ensureResizedVariantCached(did, cid, 1200);
  if (!url) return null;
  return new Response(null, {
    status: 302,
    headers: {
      // A day, not a year: a republish can swap the cover image at the same
      // route URL.
      Location: url,
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "CDN-Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
