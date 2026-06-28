import { Replicache } from "replicache";
import { v7 } from "uuid";
import { ReplicacheMutators } from "src/replicache";

// Sets an existing image (an in-document image block) as the publication cover.
//
// The cover is copied into its own standalone entity referenced by
// root/cover-image, reusing the source's uploaded src rather than re-uploading.
// Because the cover is a separate entity, deleting the source block leaves the
// cover intact; the shared src lets callers detect "this block is the cover".
export async function setCoverImageFromEntity(
  rep: Replicache<ReplicacheMutators>,
  opts: {
    rootEntity: string;
    permission_set: string;
    image: { src: string; width: number; height: number; fallback: string };
    alt?: string;
  },
) {
  let coverEntity = v7();
  await rep.mutate.createEntity([
    { entityID: coverEntity, permission_set: opts.permission_set },
  ]);

  if (opts.alt)
    await rep.mutate.assertFact({
      entity: coverEntity,
      attribute: "image/alt",
      data: { type: "string", value: opts.alt },
      ignoreUndo: true,
    });

  await rep.mutate.assertFact({
    entity: coverEntity,
    attribute: "block/image",
    data: {
      type: "image",
      src: opts.image.src,
      width: opts.image.width,
      height: opts.image.height,
      fallback: opts.image.fallback,
    },
    ignoreUndo: true,
  });

  await rep.mutate.assertFact({
    entity: opts.rootEntity,
    attribute: "root/cover-image",
    data: { type: "reference", value: coverEntity },
    ignoreUndo: true,
  });
}
