export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Downscaling proxy for storage images, used by the next/image loader
// (supabase/supabase-image-loader.js). Resizing here instead of via
// Supabase's render/image endpoint avoids their per-origin-image
// transformation billing; the original comes off Supabase's CDN (cached,
// immutable) and the resized response is CDN-cached for a year, so the
// function only runs on edge misses.
const ALLOWED_BUCKETS = new Set(["minilink-user-assets", "url-previews"]);
const CACHE_CONTROL =
  "public, max-age=31536000, immutable, s-maxage=86400, stale-while-revalidate=604800";
const CDN_CACHE_CONTROL =
  "public, s-maxage=31536000, immutable, stale-while-revalidate=604800";

function parseDimension(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  // Clamp to a sane upper bound so the proxy can't be used to request
  // arbitrarily large resizes.
  return Math.min(parsed, 2000);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "";
  const width = parseDimension(url.searchParams.get("width"));

  const bucket = path.split("/")[0];
  if (!ALLOWED_BUCKETS.has(bucket) || path.includes(".."))
    return new NextResponse(null, { status: 400 });

  const origin = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/storage/v1/object/public/${path}`,
  );
  if (!origin.ok) return new NextResponse(null, { status: 404 });
  const original = Buffer.from(await origin.arrayBuffer());
  const originalHeaders = {
    "Content-Type":
      origin.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": CACHE_CONTROL,
    "CDN-Cache-Control": CDN_CACHE_CONTROL,
  };

  if (!width) return new NextResponse(new Uint8Array(original), { headers: originalHeaders });

  try {
    // rotate() applies EXIF orientation, which imgproxy did implicitly.
    // withoutEnlargement mirrors imgproxy's no-upscale default.
    const resized = await sharp(original, { animated: true })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });
    return new NextResponse(new Uint8Array(resized.data), {
      headers: {
        ...originalHeaders,
        "Content-Type": `image/${resized.info.format}`,
      },
    });
  } catch (e) {
    // Not something sharp can decode (or a corrupt upload) — serve it as-is.
    console.log("failed to resize storage image", path, e);
    return new NextResponse(new Uint8Array(original), { headers: originalHeaders });
  }
}
