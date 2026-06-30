import { encodeBitmapToWebP } from "./encodeBitmapToWebP";

// Publication icons render at most ~48px; keep a buffer for hi-dpi displays.
const MAX_ICON_DIMENSION = 144;

// Decode, downscale, and re-encode an uploaded icon to WebP on the client before
// it's handed to the publication create/update server actions. The file is sent
// as a server action argument, which is capped by next.config's bodySizeLimit —
// passing a multi-megapixel photo straight through overflows that limit and the
// request fails before our code runs, leaving the form spinning. Shrinking it
// here keeps the payload tiny and normalizes formats the server's sharp pass
// might not decode. Throws if the browser can't decode the input (e.g. HEIC in
// Chromium) so callers can surface a real error instead of hanging.
export async function prepareIconFile(file: File): Promise<File> {
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
