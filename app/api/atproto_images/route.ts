export const runtime = "nodejs";

import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";

let idResolver = new IdResolver();

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

// Reuse the existing image-cache bucket (it already has Supabase image
// transformations enabled — see app/api/link_previews/route.ts).
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
 * cache is immutable) and returns a downscaled version of it via Supabase's
 * image transform. We stream the bytes back ourselves (rather than redirecting
 * to the public transform URL) so the thumbnail is a single round trip served
 * with our own immutable cache headers. Returns null if it can't be produced.
 */
async function getTransformedBlob(
  did: string,
  cid: string,
  transform: { width?: number; height?: number },
): Promise<Blob | null> {
  if (!did || !cid) return null;

  const path = `${COVER_IMAGE_PREFIX}/${cid}`;

  // Only fetch + upload the full blob if it isn't already cached.
  const { data: existing } = await supabase.storage
    .from(COVER_IMAGE_BUCKET)
    .list(COVER_IMAGE_PREFIX, { limit: 1, search: cid });

  if (!existing || existing.length === 0) {
    const response = await fetchAtprotoBlob(did, cid);
    if (!response) return null;

    const { error } = await supabase.storage
      .from(COVER_IMAGE_BUCKET)
      .upload(path, await response.arrayBuffer(), {
        contentType: response.headers.get("content-type") || undefined,
        cacheControl: "public, max-age=31536000, immutable",
        upsert: true,
      });
    if (error) {
      console.log("failed to cache cover image for transform", error);
      return null;
    }
  }

  const { data, error } = await supabase.storage
    .from(COVER_IMAGE_BUCKET)
    .download(path, {
      transform: {
        width: transform.width,
        height: transform.height,
        resize: "cover",
      },
    });
  if (error || !data) {
    console.log("failed to fetch transformed cover image", error);
    return null;
  }
  return data;
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
  // (via Supabase's image transform) instead of the full-resolution blob.
  if (width || height) {
    const transformed = await getTransformedBlob(params.did, params.cid, {
      width,
      height,
    });
    if (transformed) {
      return new NextResponse(transformed, {
        headers: {
          "Content-Type": transformed.type || "image/jpeg",
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
