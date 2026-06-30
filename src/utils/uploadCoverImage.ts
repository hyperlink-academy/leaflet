import { Replicache } from "replicache";
import { v7 } from "uuid";
import { addImage } from "src/utils/addImage";
import { ReplicacheMutators } from "src/replicache";

// Uploads `file` as the publication cover image. Shared by the publish-page and
// metadata-bar "Add/Change Cover" controls.
//
// When a cover already exists, the upload overwrites that same entity's
// block/image (cardinality one) rather than minting a new entity — so replacing
// the cover doesn't orphan the previous cover entity, and root/cover-image
// stays pointed at it. To set a cover from an existing image block instead, use
// setCoverImageFromEntity.
//
// The previous image's storage blob is intentionally left in place: covers may
// share their src with an in-document image block (see setCoverImageFromEntity),
// and the eav-only mutation index can't prove a blob is unreferenced, so
// deleting it risks breaking a block that still points at it.
export async function uploadCoverImage(
  rep: Replicache<ReplicacheMutators>,
  file: File,
  opts: {
    rootEntity: string;
    permission_set: string;
    existingCoverEntity?: string | null;
  },
) {
  if (!file.type.startsWith("image/")) return;

  let coverEntity = opts.existingCoverEntity ?? v7();
  if (!opts.existingCoverEntity) {
    await rep.mutate.createEntity([
      { entityID: coverEntity, permission_set: opts.permission_set },
    ]);
  }

  await addImage(file, rep, {
    entityID: coverEntity,
    attribute: "block/image",
    ignoreUndo: true,
  });

  if (!opts.existingCoverEntity) {
    await rep.mutate.assertFact({
      entity: opts.rootEntity,
      attribute: "root/cover-image",
      data: { type: "reference", value: coverEntity },
      ignoreUndo: true,
    });
  }
}
