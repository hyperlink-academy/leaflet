import { Replicache } from "replicache";
import { ReplicacheMutators } from "../replicache";
import { supabaseBrowserClient } from "supabase/browserClient";
import type { FilterAttributes } from "src/replicache/attributes";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { v7 } from "uuid";

export const localImages = new Map<string, boolean>();

// Caps concurrent addImage pipelines so a 30-image paste does not pin the main
// thread on decode/encode/thumbhash work or saturate uplink bandwidth.
const MAX_CONCURRENT_IMAGE_UPLOADS = 4;
let active = 0;
const waiters: Array<() => void> = [];
function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT_IMAGE_UPLOADS) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waiters.push(() => {
      active++;
      resolve();
    });
  });
}
function releaseSlot() {
  active--;
  const next = waiters.shift();
  if (next) next();
}

export async function addImage(
  file: File,
  rep: Replicache<ReplicacheMutators>,
  args: {
    entityID: string;
    attribute: keyof FilterAttributes<{ type: "image" }>;
  },
) {
  await acquireSlot();
  try {
    await runAddImage(file, rep, args);
  } finally {
    releaseSlot();
  }
}

async function runAddImage(
  file: File,
  rep: Replicache<ReplicacheMutators>,
  args: {
    entityID: string;
    attribute: keyof FilterAttributes<{ type: "image" }>;
  },
) {
  let client = supabaseBrowserClient();
  let cache = await caches.open("minilink-user-assets");
  let isAnimated = await isAnimatedFormat(file);
  let fileID = v7() + (isAnimated ? "." + file.name.split(".").pop() : "");
  let url = client.storage.from("minilink-user-assets").getPublicUrl(fileID)
    .data.publicUrl;

  let uploadBlob: Blob;
  let width: number;
  let height: number;
  let thumbhash: string;
  if (isAnimated) {
    // Skip re-encoding for animated formats (GIF, APNG, animated WebP) to
    // preserve animation frames. Still produce a thumbhash from the first
    // frame.
    uploadBlob = file;
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    thumbhash = computeThumbHashFromBitmap(bitmap);
    bitmap.close();
  } else {
    // Re-encode through canvas to bake EXIF orientation into pixel data.
    // iPhone photos have EXIF rotation metadata that browsers respect, but
    // Supabase's image transformation pipeline strips without applying.
    const bitmap = await createImageBitmap(file);
    const normalized = normalizeOrientation(bitmap);
    uploadBlob = await new Promise<Blob>((resolve) =>
      normalized.canvas.toBlob((b) => resolve(b!), "image/webp", 0.92),
    );
    width = normalized.canvas.width;
    height = normalized.canvas.height;
    thumbhash = computeThumbHashFromBitmap(bitmap);
    bitmap.close();
  }

  await cache.put(
    new URL(url + "?local"),
    new Response(uploadBlob, {
      headers: {
        "Content-Type": uploadBlob.type,
        "Content-Length": uploadBlob.size.toString(),
      },
    }),
  );
  localImages.set(url, true);

  if (navigator.serviceWorker)
    await rep.mutate.assertFact({
      entity: args.entityID,
      attribute: "block/image",
      data: {
        fallback: thumbhash,
        type: "image",
        local: rep.clientID,
        src: url,
        height,
        width,
      },
    });
  await client.storage.from("minilink-user-assets").upload(fileID, uploadBlob, {
    cacheControl: "public, max-age=31560000, immutable",
  });
  await rep.mutate.assertFact({
    entity: args.entityID,
    attribute: args.attribute,
    data: {
      fallback: thumbhash,
      type: "image",
      src: url,
      height,
      width,
    },
  });
}

function computeThumbHashFromBitmap(bitmap: ImageBitmap): string {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const maxDimension = 100;
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > height) {
    if (width > maxDimension) {
      height *= maxDimension / width;
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width *= maxDimension / height;
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(bitmap, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  return thumbHashToDataURL(
    rgbaToThumbHash(imageData.width, imageData.height, imageData.data),
  );
}

async function isAnimatedFormat(file: File): Promise<boolean> {
  if (file.type === "image/gif" || file.type === "image/apng") return true;
  if (file.type === "image/webp") {
    // WebP files have an "ANIM" chunk header when animated. We only need the
    // first ~40 bytes to find it.
    try {
      const head = await file.slice(0, 64).arrayBuffer();
      const bytes = new Uint8Array(head);
      // Look for the four-byte ASCII sequence "ANIM" after the RIFF/WEBP
      // preamble.
      for (let i = 12; i < bytes.length - 3; i++) {
        if (
          bytes[i] === 0x41 &&
          bytes[i + 1] === 0x4e &&
          bytes[i + 2] === 0x49 &&
          bytes[i + 3] === 0x4d
        ) {
          return true;
        }
      }
    } catch {
      // Defensive: if we can't read the header, assume static webp.
    }
  }
  return false;
}

function normalizeOrientation(bitmap: ImageBitmap): { canvas: HTMLCanvasElement } {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  return { canvas };
}
