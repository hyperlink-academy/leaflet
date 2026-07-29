function drawToCanvas(
  bitmap: ImageBitmap,
  maxDimension?: number,
): HTMLCanvasElement {
  let width = bitmap.width;
  let height = bitmap.height;
  if (maxDimension) {
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

async function canvasToWebP(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", quality),
  );
  if (!blob) throw new Error("Could not encode image");
  return blob;
}

// `preferLossless` is meant for PNG sources: they are screenshots, diagrams
// and flat art far more often than they are photographs, and those are exactly
// the content a lossy pass damages most — while also being the content
// lossless WebP compresses best, often below what the lossy encoder produces.
//
// Chromium encodes WebP losslessly at quality 1. Browsers where it doesn't
// just yield a high-quality lossy encode instead, which the size comparison
// handles on its own — so this needs no per-browser detection. Taking the
// smaller of the two also guarantees an upload is never larger than the
// lossy-only path would have produced, which keeps published blobs from
// growing (they're copied byte-for-byte to the PDS at publish time).
export async function encodeBitmapToWebP(
  bitmap: ImageBitmap,
  opts: { quality: number; maxDimension?: number; preferLossless?: boolean },
): Promise<Blob> {
  const canvas = drawToCanvas(bitmap, opts.maxDimension);
  if (!opts.preferLossless) return canvasToWebP(canvas, opts.quality);
  const [lossless, lossy] = await Promise.all([
    canvasToWebP(canvas, 1),
    canvasToWebP(canvas, opts.quality),
  ]);
  return lossless.size <= lossy.size ? lossless : lossy;
}

const MAX_ICON_DIMENSION = 144;

export async function encodeIconFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const blob = await encodeBitmapToWebP(bitmap, {
      quality: 0.9,
      maxDimension: MAX_ICON_DIMENSION,
    });
    return new File([blob], "icon.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
