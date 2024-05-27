"use client";
import { useEntity, useReplicache } from "../../replicache";
import NextImage from "next/image";
import { TextBlock } from "../../components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
import { supabaseBrowserClient } from "../../supabase/browserClient";
export function AddBlock(props: { entityID: string }) {
  let rep = useReplicache();
  let blocks = useEntity(props.entityID, "card/block")?.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  });
  return (
    <button
      onMouseDown={() => {
        rep?.rep?.mutate.addBlock({
          parent: props.entityID,
          position: generateKeyBetween(null, blocks[0]?.data.position || null),
          newEntityID: crypto.randomUUID(),
        });
      }}
    >
      add block
    </button>
  );
}

export function AddImageBlock(props: { entityID: string }) {
  let rep = useReplicache();
  let blocks = useEntity(props.entityID, "card/block")?.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  });
  return (
    <input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        let file = e.currentTarget.files?.[0];
        if (!file) return;
        let client = supabaseBrowserClient();
        let cache = await caches.open("minilink-user-assets");
        let hash = await computeHash(file);
        let url = client.storage.from("minilink-user-assets").getPublicUrl(hash)
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
        let newBlockEntity = crypto.randomUUID();
        await rep?.rep?.mutate.addBlock({
          parent: props.entityID,
          position: generateKeyBetween(null, blocks[0]?.data.position || null),
          newEntityID: newBlockEntity,
        });
        await rep?.rep?.mutate.assertFact({
          entity: newBlockEntity,
          attribute: "block/image",
          data: {
            type: "image",
            src: url,
            height: dimensions.height,
            width: dimensions.width,
          },
        });
        await client.storage.from("minilink-user-assets").upload(hash, file);
      }}
    />
  );
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

async function computeHash(data: File): Promise<string> {
  let buffer = await data.arrayBuffer();
  const buf = await crypto.subtle.digest("SHA-256", new Uint8Array(buffer));
  return Array.from(new Uint8Array(buf), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function Blocks(props: { entityID: string }) {
  let blocks = useEntity(props.entityID, "card/block");

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-1 p-2">
      {blocks
        ?.sort((a, b) => {
          return a.data.position > b.data.position ? 1 : -1;
        })
        .map((f, index, arr) => {
          return (
            <Block
              key={f.data.value}
              entityID={f.data.value}
              parent={props.entityID}
              position={f.data.position}
              previousBlock={arr[index - 1]?.data || null}
              nextPosition={arr[index + 1]?.data.position || null}
            />
          );
        })}
    </div>
  );
}

function Block(props: {
  entityID: string;
  parent: string;
  position: string;
  previousBlock: { position: string; value: string } | null;
  nextPosition: string | null;
}) {
  let image = useEntity(props.entityID, "block/image");
  if (image)
    return (
      <div className="border p-2 w-full">
        <img
          alt={""}
          src={image.data.src}
          height={image.data.height}
          width={image.data.width}
        />
      </div>
    );
  return (
    <div className="border p-2 w-full">
      <TextBlock {...props} />
    </div>
  );
}
