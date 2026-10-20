import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import type { Data } from "src/replicache/attributes";
import { prepareImage } from "src/utils/addImage";

export const COVER_ASPECT = 1200 / 630;

export type CoverCrop = { x: number; y: number; width: number; height: number };

type ImageData = Data<"block/image">;

const MAX_OUTPUT_WIDTH = 2400;

export async function renderCoverCrop(
  bitmap: ImageBitmap,
  crop: CoverCrop,
): Promise<File> {
  let sx = crop.x * bitmap.width;
  let sy = crop.y * bitmap.height;
  let sw = crop.width * bitmap.width;
  let sh = crop.height * bitmap.height;
  let width = Math.max(1, Math.round(Math.min(sw, MAX_OUTPUT_WIDTH)));
  let height = Math.max(1, Math.round(width / COVER_ASPECT));

  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);

  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Could not encode cropped image");
  return new File([blob], "cover.png", { type: "image/png" });
}

export async function saveCoverImageCrop(
  rep: Replicache<ReplicacheMutators>,
  opts: {
    coverEntity: string;
    original: ImageData;
    crop: CoverCrop;
    file: File;
  },
) {
  let { imageFact, finishUpload } = await prepareImage(opts.file, rep, {
    entityID: opts.coverEntity,
    attribute: "block/image",
    ignoreUndo: true,
  });
  let { local: _local, ...original } = opts.original;
  await rep.mutate.assertFact({
    entity: opts.coverEntity,
    attribute: "cover-image/original",
    data: original,
    ignoreUndo: true,
  });
  await rep.mutate.assertFact({
    entity: opts.coverEntity,
    attribute: "cover-image/crop",
    data: { type: "view-box", value: opts.crop },
    ignoreUndo: true,
  });
  await rep.mutate.assertFact(imageFact);
  await finishUpload();
}

export async function clearCoverImageCrop(
  rep: Replicache<ReplicacheMutators>,
  coverEntity: string,
) {
  await rep.mutate.retractAttribute({
    entity: coverEntity,
    attribute: ["cover-image/original", "cover-image/crop"],
    ignoreUndo: true,
  });
}
