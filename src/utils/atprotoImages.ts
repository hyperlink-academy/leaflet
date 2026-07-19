import { IdResolver } from "@atproto/identity";
import sharp from "sharp";
import { supabaseServerClient } from "supabase/serverClient";
import type { ImageWidth } from "supabase/imageSizes";

// Cached-image machinery shared by /api/atproto_images, the publication icon
// routes, and the post OG images. Images derived from PDS blobs are stored in
// the url-previews bucket and served off Supabase's CDN by redirect rather
// than streamed through Vercel: bytes leaving Vercel bill at fast data
// transfer rates (currently in overage), while Supabase serves the same bytes
// as cheap cached egress.

let idResolver = new IdResolver();

// Reuse the existing image-cache bucket (see app/api/link_previews/route.ts).
const IMAGE_CACHE_BUCKET = "url-previews";
const COVER_IMAGE_PREFIX = "post-cover";
// storage-js expects seconds, not a header value.
const STORAGE_CACHE_SECONDS = "31536000";

export function imageCacheUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/storage/v1/object/public/${IMAGE_CACHE_BUCKET}/${path}`;
}

/**
 * Fetches a blob from an AT Protocol PDS given a DID and CID
 * Returns the Response object or null if the blob couldn't be fetched
 */
export async function fetchAtprotoBlob(
  did: string,
  cid: string,
): Promise<Response | null> {
  if (!did || !cid) return null;

  let identity = await idResolver.did.resolve(did);
  let service = identity?.service?.find((f) => f.id === "#atproto_pds");
  if (!service) return null;

  const response = await fetch(
    `${service.serviceEndpoint}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`,
    {
      headers: {
        "Accept-Encoding": "gzip, deflate, br, zstd",
      },
    },
  );

  if (!response.ok) return null;

  return response;
}

/**
 * Ensures the original PDS blob is cached in storage with a well-formed
 * Cache-Control. (Uploads from before the storage-js seconds fix stored a
 * malformed `max-age=public, ...` header, which defeats CDN caching — those
 * get re-uploaded once.) Returns the object's public URL, plus the bytes
 * when they already passed through here so callers can reuse them without
 * another round trip. Null when the blob can't be produced at that URL.
 */
export async function ensureOriginalCached(
  did: string,
  cid: string,
): Promise<{ url: string; bytes: ArrayBuffer | null } | null> {
  if (!did || !cid) return null;
  const path = `${COVER_IMAGE_PREFIX}/${cid}`;
  const url = imageCacheUrl(path);

  const head = await fetch(url, { method: "HEAD" });
  const malformed = (head.headers.get("cache-control") ?? "").includes(
    "max-age=public",
  );
  if (head.ok && !malformed) return { url, bytes: null };

  let source = head.ok ? await fetch(url) : await fetchAtprotoBlob(did, cid);
  if (!source || !source.ok) return null;
  const bytes = await source.arrayBuffer();

  const { error } = await supabaseServerClient.storage
    .from(IMAGE_CACHE_BUCKET)
    .upload(path, bytes, {
      contentType: source.headers.get("content-type") || undefined,
      cacheControl: STORAGE_CACHE_SECONDS,
      upsert: true,
    });
  if (error) {
    console.log("failed to cache cover image", error);
    // With nothing stored at the URL there is nothing to redirect to.
    if (!head.ok) return null;
  }
  return { url, bytes };
}

/**
 * Ensures a derived image exists at `path` in the cache bucket, calling
 * `produce` for the bytes on a miss. Returns its public URL, or null when the
 * image couldn't be produced or stored.
 */
export async function ensureDerivedImageCached(
  path: string,
  produce: () => Promise<{ bytes: Uint8Array; contentType: string } | null>,
): Promise<string | null> {
  const url = imageCacheUrl(path);
  const head = await fetch(url, { method: "HEAD" });
  if (head.ok) return url;

  const produced = await produce();
  if (!produced) return null;

  const { error } = await supabaseServerClient.storage
    .from(IMAGE_CACHE_BUCKET)
    .upload(path, produced.bytes, {
      contentType: produced.contentType,
      cacheControl: STORAGE_CACHE_SECONDS,
      upsert: true,
    });
  if (error) {
    console.log("failed to store derived image", path, error);
    return null;
  }
  return url;
}

/**
 * Ensures a resized variant of the blob is cached in storage (resized once
 * with sharp — Supabase's image transform bills per origin image per month)
 * and returns its public URL. Falls back to the cached original's URL when a
 * variant can't be produced, and null when nothing could be cached at all.
 */
export async function ensureResizedVariantCached(
  did: string,
  cid: string,
  width?: ImageWidth,
  height?: ImageWidth,
): Promise<string | null> {
  const variantUrl = await ensureDerivedImageCached(
    `${COVER_IMAGE_PREFIX}/resized/w${width ?? 0}-h${height ?? 0}/${cid}`,
    async () => {
      const original = await ensureOriginalCached(did, cid);
      if (!original) return null;
      let bytes = original.bytes;
      if (!bytes) {
        const res = await fetch(original.url);
        if (res.ok) bytes = await res.arrayBuffer();
      }
      if (!bytes) return null;
      try {
        // rotate() applies EXIF orientation, which imgproxy did
        // implicitly. withoutEnlargement mirrors imgproxy's no-upscale
        // default.
        const resized = await sharp(Buffer.from(bytes), { animated: true })
          .rotate()
          .resize({
            width,
            height,
            fit: "inside",
            withoutEnlargement: true,
          })
          .toBuffer({ resolveWithObject: true });
        return {
          bytes: new Uint8Array(resized.data),
          contentType: `image/${resized.info.format}`,
        };
      } catch (e) {
        console.log("failed to resize cover image", e);
        return null;
      }
    },
  );
  if (variantUrl) return variantUrl;
  // Couldn't produce a variant; the cached original (if any) still beats
  // streaming the full blob. Re-checking it costs a HEAD on this rare path
  // only.
  const original = await ensureOriginalCached(did, cid);
  return original?.url ?? null;
}
