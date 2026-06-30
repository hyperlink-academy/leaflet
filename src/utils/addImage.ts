import { Replicache } from "replicache";
import { ReplicacheMutators } from "../replicache";
import { supabaseBrowserClient } from "supabase/browserClient";
import type { FilterAttributes } from "src/replicache/attributes";
import type { FactInput } from "src/replicache/mutations";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { v7 } from "uuid";
import { encodeBitmapToWebP } from "./encodeBitmapToWebP";

// Maps a public image src to an in-memory object URL, for optimistic display
// before the upload completes.
export const localImages = new Map<string, string>();

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

type ImageArgs = {
  entityID: string;
  attribute: keyof FilterAttributes<{ type: "image" }>;
  // Skip recording the image facts in undo history. Callers that create the
  // containing block themselves (e.g. paste) group their own undo entry.
  ignoreUndo?: boolean;
};

export type PreparedImage = {
  // Optimistic block/image fact. Commit alongside the block's structural facts
  // so the image appears in one render, with no empty-block flash.
  imageFact: FactInput & { ignoreUndo?: true };
  // Uploads to storage, writes the final image fact, and releases the
  // concurrency slot. Call after imageFact commits.
  finishUpload: () => Promise<void>;
};

// Decodes the image and stages its optimistic preview, returning the fact to
// commit plus a continuation that uploads. Separating the two lets the caller
// batch the image fact with the block's structural facts. Holds the concurrency
// slot until finishUpload resolves.
export async function prepareImage(
  file: File,
  rep: Replicache<ReplicacheMutators>,
  args: ImageArgs,
): Promise<PreparedImage> {
  await acquireSlot();
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseSlot();
  };
  try {
    let client = supabaseBrowserClient();
    let isAnimated = await isAnimatedFormat(file);
    let fileID = v7() + (isAnimated ? "." + file.name.split(".").pop() : "");
    let url = client.storage.from("minilink-user-assets").getPublicUrl(fileID)
      .data.publicUrl;

    // Decode once for dimensions + thumbhash. localImages must be set before the
    // fact commits so the block renders the preview, not the fallback, on first
    // paint.
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    const thumbhash = computeThumbHashFromBitmap(bitmap);
    localImages.set(url, URL.createObjectURL(file));

    const imageFact: FactInput & { ignoreUndo?: true } = {
      entity: args.entityID,
      attribute: "block/image",
      ignoreUndo: args.ignoreUndo || undefined,
      data: {
        fallback: thumbhash,
        type: "image",
        local: rep.clientID,
        src: url,
        height,
        width,
      },
    };

    const finishUpload = async () => {
      try {
        // Animated formats (GIF, APNG, animated WebP) pass through untouched to
        // keep their frames; everything else is re-encoded to WebP.
        const uploadBlob = isAnimated
          ? file
          : await encodeBitmapToWebP(bitmap, { quality: 0.92 });
        bitmap.close();
        await client.storage
          .from("minilink-user-assets")
          .upload(fileID, uploadBlob, {
            cacheControl: "public, max-age=31560000, immutable",
          });
        await rep.mutate.assertFact({
          entity: args.entityID,
          attribute: args.attribute,
          ignoreUndo: args.ignoreUndo || undefined,
          data: {
            fallback: thumbhash,
            type: "image",
            src: url,
            height,
            width,
          },
        });
      } finally {
        release();
      }
    };

    return { imageFact, finishUpload };
  } catch (e) {
    release();
    throw e;
  }
}

// For callers whose block already renders (image upload UI, canvas drop):
// commit the preview fact, then upload.
export async function addImage(
  file: File,
  rep: Replicache<ReplicacheMutators>,
  args: ImageArgs,
) {
  let { imageFact, finishUpload } = await prepareImage(file, rep, args);
  await rep.mutate.assertFact(imageFact);
  await finishUpload();
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
