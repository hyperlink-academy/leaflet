export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { snapToImageWidth, type ImageWidth } from "supabase/imageSizes";
import {
  ensureOriginalCached,
  ensureResizedVariantCached,
  fetchAtprotoBlob,
} from "src/utils/atprotoImages";

const CACHE_CONTROL =
  "public, max-age=31536000, immutable, s-maxage=86400, stale-while-revalidate=604800";
// CID-addressed content never changes, so cache it at the edge for a year.
const CDN_CACHE_CONTROL =
  "public, s-maxage=31536000, immutable, stale-while-revalidate=604800";

function parseDimension(value: string | null): ImageWidth | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return snapToImageWidth(parsed);
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = {
    did: url.searchParams.get("did") ?? "",
    cid: url.searchParams.get("cid") ?? "",
  };

  const width = parseDimension(url.searchParams.get("width"));
  const height = parseDimension(url.searchParams.get("height"));

  if (width || height) {
    const variantUrl = await ensureResizedVariantCached(
      params.did,
      params.cid,
      width,
      height,
    );
    if (variantUrl) return redirect(variantUrl);
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
