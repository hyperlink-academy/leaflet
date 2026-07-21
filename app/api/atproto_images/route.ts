export const runtime = "nodejs";

import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServerClient } from "supabase/serverClient";
import { snapToImageWidth } from "supabase/imageSizes";

let idResolver = new IdResolver();

// Reuse the existing image-cache bucket (see app/api/link_previews/route.ts).
const COVER_IMAGE_BUCKET = "url-previews";
const COVER_IMAGE_PREFIX = "post-cover";
const CACHE_CONTROL =
  "public, max-age=31536000, immutable, s-maxage=86400, stale-while-revalidate=604800";
// CID-addressed content never changes, so cache it at the edge for a year.
const CDN_CACHE_CONTROL =
  "public, s-maxage=31536000, immutable, stale-while-revalidate=604800";

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

function parseDimension(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return snapToImageWidth(parsed);
}

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/storage/v1/object/public/${COVER_IMAGE_BUCKET}/${path}`;
}

// Bytes are served straight off Supabase's CDN rather than streamed through
// this function: bytes leaving Vercel bill at fast data transfer rates
// (currently in overage), while Supabase serves the same bytes as cheap
// cached egress. Only this tiny 302 comes from Vercel, edge-cached for a
// year since CID-addressed content never changes.
function redirect(to: string) {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: to,
      "Cache-Control": CACHE_CONTROL,
      "CDN-Cache-Control": CDN_CACHE_CONTROL,
    },
  });
}

/**
 * Ensures the original PDS blob is cached in storage with a well-formed
 * Cache-Control. (Uploads from before the storage-js seconds fix stored a
 * malformed `max-age=public, ...` header, which defeats CDN caching — those
 * get re-uploaded once.) Returns the object's public URL, plus the bytes
 * when they already passed through here so callers can reuse them without
 * another round trip. Null when the blob can't be produced at that URL.
 */
async function ensureOriginalCached(
  did: string,
  cid: string,
): Promise<{ url: string; bytes: ArrayBuffer | null } | null> {
  if (!did || !cid) return null;
  const path = `${COVER_IMAGE_PREFIX}/${cid}`;
  const url = publicUrl(path);

  const head = await fetch(url, { method: "HEAD" });
  const malformed = (head.headers.get("cache-control") ?? "").includes(
    "max-age=public",
  );
  if (head.ok && !malformed) return { url, bytes: null };

  let source = head.ok ? await fetch(url) : await fetchAtprotoBlob(did, cid);
  if (!source || !source.ok) return null;
  const bytes = await source.arrayBuffer();

  const { error } = await supabaseServerClient.storage
    .from(COVER_IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType: source.headers.get("content-type") || undefined,
      // storage-js expects seconds, not a header value.
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) {
    console.log("failed to cache cover image", error);
    // With nothing stored at the URL there is nothing to redirect to.
    if (!head.ok) return null;
  }
  return { url, bytes };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = {
    did: url.searchParams.get("did") ?? "",
    cid: url.searchParams.get("cid") ?? "",
  };

  const width = parseDimension(url.searchParams.get("width"));
  const height = parseDimension(url.searchParams.get("height"));

  if (width || height) {
    // Thumbnail: resized once with sharp (Supabase's image transform bills
    // per origin image per month), stored, and served by redirect.
    const variantPath = `${COVER_IMAGE_PREFIX}/resized/w${width ?? 0}-h${height ?? 0}/${params.cid}`;
    const variantUrl = publicUrl(variantPath);
    const existing = await fetch(variantUrl, { method: "HEAD" });
    if (existing.ok) return redirect(variantUrl);

    const original = await ensureOriginalCached(params.did, params.cid);
    if (original) {
      let bytes = original.bytes;
      if (!bytes) {
        const res = await fetch(original.url);
        if (res.ok) bytes = await res.arrayBuffer();
      }
      if (bytes) {
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
          const { error } = await supabaseServerClient.storage
            .from(COVER_IMAGE_BUCKET)
            .upload(variantPath, new Uint8Array(resized.data), {
              contentType: `image/${resized.info.format}`,
              cacheControl: "31536000",
              upsert: true,
            });
          if (!error) return redirect(variantUrl);
          console.log("failed to store cover variant", variantPath, error);
        } catch (e) {
          console.log("failed to resize cover image", e);
        }
      }
      // Couldn't produce a variant; the cached original still beats
      // streaming the full blob through this function.
      return redirect(original.url);
    }
    // Fall through to streaming if nothing could be cached.
  } else {
    const original = await ensureOriginalCached(params.did, params.cid);
    if (original) return redirect(original.url);
  }

  // Last resort: stream straight from the PDS.
  const response = await fetchAtprotoBlob(params.did, params.cid);
  if (!response) return new NextResponse(null, { status: 404 });

  // Clone the response to modify headers
  const cachedResponse = new Response(response.body, response);

  // Set cache-control header to cache indefinitely
  cachedResponse.headers.set("Cache-Control", CACHE_CONTROL);
  cachedResponse.headers.set("CDN-Cache-Control", CDN_CACHE_CONTROL);

  return cachedResponse;
}
