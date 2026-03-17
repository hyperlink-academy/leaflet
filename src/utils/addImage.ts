import { Replicache } from "replicache";
import { ReplicacheMutators } from "../replicache";
import { supabaseBrowserClient } from "supabase/browserClient";
import type { FilterAttributes } from "src/replicache/attributes";
import { rgbaToDataURL, rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { v7 } from "uuid";

export const localImages = new Map<string, boolean>();
export async function addImage(
  file: File,
  rep: Replicache<ReplicacheMutators>,
  args: {
    entityID: string;
    attribute: keyof FilterAttributes<{ type: "image" }>;
  },
) {
  let client = supabaseBrowserClient();
  let cache = await caches.open("minilink-user-assets");
  let fileID = v7();
  let url = client.storage.from("minilink-user-assets").getPublicUrl(fileID)
    .data.publicUrl;
  // Re-encode through canvas to bake EXIF orientation into pixel data.
  // iPhone photos have EXIF rotation metadata that browsers respect, but
  // Supabase's image transformation pipeline strips without applying.
  let { blob: uploadBlob, width, height } = await normalizeOrientation(file);

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

  let thumbhash = await getThumbHash(file);
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

async function getThumbHash(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const imageBitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const maxDimension = 100;
  let width = imageBitmap.width;
  let height = imageBitmap.height;

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
  context.drawImage(imageBitmap, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const thumbHash = thumbHashToDataURL(
    rgbaToThumbHash(imageData.width, imageData.height, imageData.data),
  );
  return thumbHash;
}

async function normalizeOrientation(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap = await createImageBitmap(file);
  let canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  let ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  let blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/webp", 0.92),
  );
  return { blob, width: canvas.width, height: canvas.height };
}
