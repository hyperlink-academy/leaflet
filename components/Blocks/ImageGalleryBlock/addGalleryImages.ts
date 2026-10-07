import { Replicache } from "replicache";
import { v7 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import type { ReplicacheMutators } from "src/replicache";
import { byPosition } from "src/replicache/mutations";
import { scanIndex } from "src/replicache/utils";
import { prepareImage } from "src/utils/addImage";

export async function addGalleryImages(
  rep: Replicache<ReplicacheMutators>,
  args: { galleryEntity: string; permission_set: string; files: File[] },
) {
  let files = args.files.filter((f) => f.type.startsWith("image/"));
  if (files.length === 0) return;

  // Decodes finish out of order, so fix each file's position up front.
  let children = await rep.query((tx) =>
    scanIndex(tx).eav(args.galleryEntity, "gallery/image"),
  );
  let last = children.toSorted(byPosition).at(-1);
  let positions = generateNKeysBetween(
    last?.data.position ?? null,
    null,
    files.length,
  );

  await Promise.allSettled(
    files.map(async (file, i) => {
      let imageEntity = v7();
      let { imageFact, finishUpload } = await prepareImage(file, rep, {
        entityID: imageEntity,
        attribute: "block/image",
        ignoreUndo: true,
      });
      try {
        await rep.mutate.addGalleryImage({
          galleryEntity: args.galleryEntity,
          imageEntity,
          factID: v7(),
          permission_set: args.permission_set,
          position: positions[i],
          ignoreUndo: true,
        });
        await rep.mutate.assertFact(imageFact);
        if (file.name)
          await rep.mutate.assertFact({
            entity: imageEntity,
            attribute: "image/name",
            data: { type: "string", value: file.name },
            ignoreUndo: true,
          });
      } finally {
        await finishUpload();
      }
    }),
  );
}
