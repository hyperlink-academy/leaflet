import sharp from "sharp";

// Outlook's Word rendering engine and older Apple Mail can't display WebP,
// which is what the editor uploads (src/utils/addImage.ts) and therefore what
// most published blobs are. Images bound for an inbox get transcoded to one of
// these on the way out.
const EMAIL_SAFE_FORMATS = new Set(["png", "jpeg", "gif"]);

// The source has already been through one lossy encode, so these settings buy
// headroom against a second: 4:4:4 keeps colour detail at the hard edges
// (text, UI chrome, line art) that subsampling smears and that compound most
// visibly across generations.
const JPEG_OPTIONS = { quality: 90, chromaSubsampling: "4:4:4" } as const;

// How much larger a lossless PNG may be than the JPEG before it stops being
// worth it. Flat, low-colour content — screenshots and diagrams, where a
// second lossy pass is most visible — compresses to at or below JPEG's size,
// so it wins outright. Photographs run 5-10x and fall through to JPEG, where
// the recompression is imperceptible anyway.
const PNG_SIZE_TOLERANCE = 1.5;

// Display variants get re-encoded rather than inheriting the source's
// fidelity: the editor uploads lossless WebP for PNG sources
// (src/utils/imageEncoding.ts), and serving those bytes at every display size
// is the byte volume the CDN work exists to avoid. sharp's implicit WebP
// default already lands on lossy q80, but a display path that silently
// depends on an encoder default is a regression waiting to happen.
const WEB_WEBP_QUALITY = 80;

// The only variant format the image proxies will produce. Kept to a closed
// allowlist for the same reason widths are snapped to a ladder: the value is
// caller-controlled and each distinct one mints a permanent stored variant.
export function parseImageFormat(value: string | null): "email" | undefined {
  return value === "email" ? "email" : undefined;
}

// Encodes a stored variant for an image-proxy request, or null when the
// original bytes already satisfy it (email-safe source, no resize asked for)
// and the caller should redirect to the source instead of storing anything.
//
// rotate() applies EXIF orientation, which imgproxy did implicitly; callers
// pass withoutEnlargement in `resize` to mirror imgproxy's no-upscale default.
export async function encodeImageVariant(
  input: Buffer,
  opts: { resize?: sharp.ResizeOptions; format?: "email" },
): Promise<{ data: Buffer; format: string } | null> {
  // A fresh instance per call: output format is sticky on a sharp instance,
  // and the email path encodes more than once to compare sizes.
  const pipeline = () => {
    const p = sharp(input, { animated: true }).rotate();
    return opts.resize ? p.resize(opts.resize) : p;
  };
  const metadata = await sharp(input).metadata();

  if (opts.format === "email") {
    const encoded = await encodeForEmail(input, pipeline, metadata);
    if (encoded) return encoded;
  }
  if (!opts.resize) return null;

  const resized = await applyWebEncoding(pipeline(), metadata.format).toBuffer({
    resolveWithObject: true,
  });
  return { data: resized.data, format: resized.info.format };
}

function applyWebEncoding(
  pipeline: sharp.Sharp,
  sourceFormat: string | undefined,
): sharp.Sharp {
  return sourceFormat === "webp"
    ? pipeline.webp({ quality: WEB_WEBP_QUALITY })
    : pipeline;
}

// Null when the source is already something every mail client renders. Costs
// several decodes of the same input, paid once per stored variant and then
// served from cache indefinitely.
async function encodeForEmail(
  input: Buffer,
  pipeline: () => sharp.Sharp,
  metadata: sharp.Metadata,
): Promise<{ data: Buffer; format: "png" | "jpeg" | "gif" } | null> {
  // Flattening an animated source to a still would silently drop frames, and
  // GIF is the only animated format with universal client support.
  if ((metadata.pages ?? 1) > 1) {
    if (metadata.format === "gif") return null;
    return { data: await pipeline().gif().toBuffer(), format: "gif" };
  }

  if (metadata.format && EMAIL_SAFE_FORMATS.has(metadata.format)) return null;

  // JPEG can't carry transparency, so genuine alpha settles it. `hasAlpha`
  // only reports that a channel exists, and treating an unused one as
  // load-bearing would put multi-megabyte stills in people's inboxes.
  const { isOpaque } = await sharp(input).stats();
  if (!isOpaque)
    return { data: await pipeline().png().toBuffer(), format: "png" };

  const [png, jpeg] = await Promise.all([
    pipeline().png({ compressionLevel: 9 }).toBuffer(),
    pipeline().jpeg(JPEG_OPTIONS).toBuffer(),
  ]);
  return png.length <= jpeg.length * PNG_SIZE_TOLERANCE
    ? { data: png, format: "png" }
    : { data: jpeg, format: "jpeg" };
}
