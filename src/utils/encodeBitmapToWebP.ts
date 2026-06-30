// Draw an already-decoded bitmap onto a canvas and encode it as WebP. Pass
// maxDimension to downscale so the longest edge is at most that many pixels
// (aspect ratio preserved, never upscaled). Re-encoding through a canvas also
// bakes EXIF orientation into the pixels, which Supabase and the PDS otherwise
// strip without applying.
export async function encodeBitmapToWebP(
  bitmap: ImageBitmap,
  opts: { quality: number; maxDimension?: number },
): Promise<Blob> {
  let width = bitmap.width;
  let height = bitmap.height;
  if (opts.maxDimension) {
    const scale = Math.min(1, opts.maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", opts.quality),
  );
  if (!blob) throw new Error("Could not encode image");
  return blob;
}
