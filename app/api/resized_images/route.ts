export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServerClient } from "supabase/serverClient";
import { snapToImageWidth } from "supabase/imageSizes";

// Downscaling for storage images, used by the next/image loader
// (supabase/supabase-image-loader.js). Resizing here with sharp instead of
// Supabase's render/image endpoint avoids their per-origin-image
// transformation billing. Each variant is resized once, stored back into
// storage, and requests are redirected to its public URL — a redirect
// instead of streaming because bytes served through Vercel bill at fast
// data transfer rates (currently in overage) while Supabase's CDN serves
// the same bytes as cached egress at a fraction of the price. Only the
// tiny 302 itself is served from Vercel, and it's edge-cached for a year.
const SOURCE_BUCKETS = new Set(["minilink-user-assets", "url-previews"]);
const VARIANT_BUCKET = "url-previews";
const CACHE_CONTROL =
  "public, max-age=31536000, immutable, s-maxage=86400, stale-while-revalidate=604800";
const CDN_CACHE_CONTROL =
  "public, s-maxage=31536000, immutable, stale-while-revalidate=604800";

function parseDimension(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return snapToImageWidth(parsed);
}

function publicUrl(bucketAndPath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/storage/v1/object/public/${bucketAndPath}`;
}

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
  const path = url.searchParams.get("path") ?? "";
  const width = parseDimension(url.searchParams.get("width"));

  const bucket = path.split("/")[0];
  if (!SOURCE_BUCKETS.has(bucket) || path.includes(".."))
    return new NextResponse(null, { status: 400 });

  if (!width) return redirect(publicUrl(path));

  const variantPath = `resized/w${width}/${path}`;
  const variantUrl = publicUrl(`${VARIANT_BUCKET}/${variantPath}`);

  const existing = await fetch(variantUrl, { method: "HEAD" });
  if (existing.ok) return redirect(variantUrl);

  const origin = await fetch(publicUrl(path));
  if (!origin.ok) return new NextResponse(null, { status: 404 });
  const original = Buffer.from(await origin.arrayBuffer());

  try {
    // rotate() applies EXIF orientation, which imgproxy did implicitly.
    // withoutEnlargement mirrors imgproxy's no-upscale default.
    const resized = await sharp(original, { animated: true })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });
    const { error } = await supabaseServerClient.storage
      .from(VARIANT_BUCKET)
      .upload(variantPath, new Uint8Array(resized.data), {
        contentType: `image/${resized.info.format}`,
        // storage-js expects seconds, not a header value.
        cacheControl: "31536000",
        upsert: true,
      });
    if (!error) return redirect(variantUrl);
    console.log("failed to store resized variant", variantPath, error);
  } catch (e) {
    // Not something sharp can decode (or a corrupt upload) — serve the
    // original instead.
    console.log("failed to resize storage image", path, e);
  }
  return redirect(publicUrl(path));
}
