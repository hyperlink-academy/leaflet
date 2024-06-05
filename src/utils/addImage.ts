import { Replicache } from "replicache";
import { ReplicacheMutators } from "../replicache";
import { supabaseBrowserClient } from "supabase/browserClient";

export async function addImage(
  file: File,
  rep: Replicache<ReplicacheMutators>,
  args: { entityID: string },
) {
  let client = supabaseBrowserClient();
  let cache = await caches.open("minilink-user-assets");
  let fileID = crypto.randomUUID();
  let url = client.storage.from("minilink-user-assets").getPublicUrl(fileID)
    .data.publicUrl;
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
  await rep.mutate.assertFact({
    entity: args.entityID,
    attribute: "block/image",
    data: {
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
    attribute: "block/image",
    data: {
      type: "image",
      src: url,
      height: dimensions.height,
      width: dimensions.width,
    },
  });
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
