import { ensureResizedVariantCached } from "app/api/atproto_images/route";
import { snapToImageWidth } from "supabase/imageSizes";

// 302 straight to the storage-cached cover variant for a post's
// opengraph-image route. A single hop rather than bouncing through
// /api/atproto_images: og-image fetchers are the flakiest HTTP clients around,
// and a two-hop cross-origin chain is where they give up. width=1200 requests
// a variant sized for unfurl cards instead of the full-resolution blob.
// Returns null when no variant could be cached so callers can fall back to
// the screenshot.
export async function coverImageRedirect(did: string, cid: string) {
  const url = await ensureResizedVariantCached(
    did,
    cid,
    snapToImageWidth(1200),
  );
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
