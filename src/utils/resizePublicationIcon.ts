import sharp from "sharp";

// Publication icons are rendered at most at 48px (the `w-12 h-12` PubIcon
// variant / 40px header). We keep a 3x buffer for high-DPI ("retina") displays,
// so there's no point uploading anything larger than this to the PDS.
const MAX_ICON_SIZE = 144;

// Scale an uploaded icon down to the size it's actually displayed at and
// re-encode it as WebP. Uses `fit: "inside"` so aspect ratio is preserved (the
// square crop happens via CSS at display time) and `withoutEnlargement` so
// small icons aren't upscaled. Falls back to the original bytes if sharp can't
// process the input (e.g. an unsupported format).
export async function resizePublicationIcon(
  file: File,
): Promise<{ data: Uint8Array; encoding: string }> {
  const original = new Uint8Array(await file.arrayBuffer());
  try {
    const resized = await sharp(Buffer.from(original))
      .resize(MAX_ICON_SIZE, MAX_ICON_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer();
    return { data: new Uint8Array(resized), encoding: "image/webp" };
  } catch {
    return { data: original, encoding: file.type };
  }
}
