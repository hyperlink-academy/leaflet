import { Replicache } from "replicache";
import { ReplicacheMutators } from "../replicache";
import { supabaseBrowserClient } from "supabase/browserClient";
import { FilterAttributes } from "src/replicache/attributes";
import { rgbaToDataURL, rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";

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
  let fileID = crypto.randomUUID();
  let url = client.storage.from("minilink-user-assets").getPublicUrl(fileID, {
    transform: {
      quality: 80,
    },
  }).data.publicUrl;
  let dimensions = await getImageDimensions(file);
  await cache.put(
    url,
    new Response(file, {
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
      },
    }),
  );
  //This may reach other clients before the image has been uploaded.
  // Maybe we should set the state to uploaded-by (client_ID) or something
  // and then set the real one after.
  let thumbhash = await getThumbHash(file);
  await rep.mutate.assertFact({
    entity: args.entityID,
    attribute: "block/image",
    data: {
      fallback: thumbhash,
      type: "image",
      local: rep.clientID,
      src: url,
      height: dimensions.height,
      width: dimensions.width,
    },
  });
  await client.storage.from("minilink-user-assets").upload(fileID, file);
  await rep.mutate.assertFact({
    entity: args.entityID,
    attribute: args.attribute,
    data: {
      fallback: thumbhash,
      type: "image",
      src: url,
      height: dimensions.height,
      width: dimensions.width,
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

function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  let url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}
