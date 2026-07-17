export const runtime = "nodejs";

import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServerClient } from "supabase/serverClient";

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
  // Clamp to a sane upper bound so the proxy can't be used to request
  // arbitrarily large transforms.
  return Math.min(parsed, 2000);
}

/**
 * Caches the PDS blob in Supabase storage (CIDs are content-addressed, so the
 * cache is immutable) and returns a downscaled version of it, resized here
 * with sharp — Supabase's image transform bills per origin image per month,
 * while resizing a thumbnail in-function costs effectively nothing and the
 * result sits behind a year-long CDN cache anyway. Returns null if it can't
 * be produced.
 */
async function getTransformedBlob(
  did: string,
  cid: string,
  transform: { width?: number; height?: number },
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!did || !cid) return null;

  const path = `${COVER_IMAGE_PREFIX}/${cid}`;

  // Try the cached original first; on a miss, fetch from the PDS and cache
  // it, resizing the bytes we already hold rather than re-downloading.
  let original: ArrayBuffer;
  const { data: cached } = await supabaseServerClient.storage
    .from(COVER_IMAGE_BUCKET)
    .download(path);
  if (cached) {
    original = await cached.arrayBuffer();
  } else {
    const response = await fetchAtprotoBlob(did, cid);
    if (!response) return null;
    original = await response.arrayBuffer();

    const { error } = await supabaseServerClient.storage
      .from(COVER_IMAGE_BUCKET)
      .upload(path, original, {
        contentType: response.headers.get("content-type") || undefined,
        // storage-js expects seconds, not a header value.
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) console.log("failed to cache cover image", error);
  }

  try {
    // rotate() applies EXIF orientation, which imgproxy did implicitly.
    // withoutEnlargement mirrors imgproxy's no-upscale default.
    const resized = await sharp(Buffer.from(original), { animated: true })
      .rotate()
      .resize({
        width: transform.width,
        height: transform.height,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer({ resolveWithObject: true });
    return {
      bytes: resized.data,
      contentType: `image/${resized.info.format}`,
    };
  } catch (e) {
    console.log("failed to resize cover image", e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = {
    did: url.searchParams.get("did") ?? "",
    cid: url.searchParams.get("cid") ?? "",
  };

  const width = parseDimension(url.searchParams.get("width"));
  const height = parseDimension(url.searchParams.get("height"));

  // When thumbnail dimensions are requested, stream back a downscaled version
  // instead of the full-resolution blob.
  if (width || height) {
    const transformed = await getTransformedBlob(params.did, params.cid, {
      width,
      height,
    });
    if (transformed) {
      return new NextResponse(new Uint8Array(transformed.bytes), {
        headers: {
          "Content-Type": transformed.contentType,
          "Cache-Control": CACHE_CONTROL,
          "CDN-Cache-Control": CDN_CACHE_CONTROL,
        },
      });
    }
    // Fall through to the original blob if the transform couldn't be produced.
  }

  const response = await fetchAtprotoBlob(params.did, params.cid);
  if (!response) return new NextResponse(null, { status: 404 });

  // Clone the response to modify headers
  const cachedResponse = new Response(response.body, response);

  // Set cache-control header to cache indefinitely
  cachedResponse.headers.set("Cache-Control", CACHE_CONTROL);
  cachedResponse.headers.set("CDN-Cache-Control", CDN_CACHE_CONTROL);

  return cachedResponse;
}
