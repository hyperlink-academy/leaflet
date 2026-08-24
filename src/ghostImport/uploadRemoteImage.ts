import sharp from "sharp";
import { v7 } from "uuid";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { supabaseServerClient } from "supabase/serverClient";

const ASSET_BUCKET = "minilink-user-assets";
const FETCH_TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

export type UploadedImage = {
  src: string;
  width: number;
  height: number;
  // thumbhash data URL, the same placeholder the editor's uploader produces.
  fallback: string;
};

export type ImageFetcher = (url: string) => Promise<UploadedImage | null>;

// Mirrors the browser upload path in src/utils/addImage.ts: animated formats
// keep their bytes and extension, everything else is re-encoded to WebP
// (lossless for PNG sources), and a thumbhash placeholder is computed from a
// downscaled decode.
export async function uploadRemoteImage(
  url: string,
): Promise<UploadedImage | null> {
  let bytes: Buffer;
  let contentType: string;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "image/*,*/*;q=0.8" },
    });
    if (!res.ok) return null;
    contentType = res.headers.get("content-type") ?? "";
    const ab = await res.arrayBuffer();
    if (ab.byteLength === 0 || ab.byteLength > MAX_IMAGE_BYTES) return null;
    bytes = Buffer.from(ab);
  } catch {
    return null;
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes).metadata();
  } catch {
    return null;
  }
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) return null;
  const format = metadata.format ?? "";
  const isAnimated =
    (metadata.pages ?? 1) > 1 ||
    format === "gif" ||
    contentType === "image/apng";

  let uploadBytes = bytes;
  let uploadType = contentType.startsWith("image/")
    ? contentType
    : `image/${format}`;
  let fileID = v7();
  if (isAnimated) {
    const ext = url.split("?")[0].split(".").pop();
    if (ext && /^[a-z0-9]{2,5}$/i.test(ext)) fileID += "." + ext.toLowerCase();
  } else {
    try {
      uploadBytes = await sharp(bytes)
        .rotate()
        .webp(format === "png" ? { lossless: true } : { quality: 92 })
        .toBuffer();
      uploadType = "image/webp";
    } catch {
      // Re-encoding is an optimisation; the original bytes still render.
    }
  }

  let fallback = "";
  try {
    const { data, info } = await sharp(bytes)
      .rotate()
      .resize({ width: 100, height: 100, fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    fallback = thumbHashToDataURL(
      rgbaToThumbHash(info.width, info.height, new Uint8Array(data)),
    );
  } catch {
    // A missing placeholder only costs the blur-up.
  }

  const { error } = await supabaseServerClient.storage
    .from(ASSET_BUCKET)
    .upload(fileID, uploadBytes, {
      contentType: uploadType,
      cacheControl: "31536000",
    });
  if (error) {
    console.error("[ghost-import] image upload failed", url, error.message);
    return null;
  }
  const src = supabaseServerClient.storage
    .from(ASSET_BUCKET)
    .getPublicUrl(fileID).data.publicUrl;

  // EXIF rotation was applied on re-encode, so report the displayed size.
  const rotated = !isAnimated && (metadata.orientation ?? 1) >= 5;
  return {
    src,
    width: rotated ? height : width,
    height: rotated ? width : height,
    fallback,
  };
}

// Fetch+upload each distinct URL once, a few at a time.
export function makeImageFetcher(
  concurrency = 4,
  upload: (url: string) => Promise<UploadedImage | null> = uploadRemoteImage,
): ImageFetcher {
  const cache = new Map<string, Promise<UploadedImage | null>>();
  let active = 0;
  const queue: Array<() => void> = [];
  const acquire = () =>
    new Promise<void>((resolve) => {
      if (active < concurrency) {
        active++;
        resolve();
      } else
        queue.push(() => {
          active++;
          resolve();
        });
    });
  const release = () => {
    active--;
    queue.shift()?.();
  };
  return (url) => {
    let p = cache.get(url);
    if (!p) {
      p = (async () => {
        await acquire();
        try {
          return await upload(url);
        } finally {
          release();
        }
      })();
      cache.set(url, p);
    }
    return p;
  };
}
