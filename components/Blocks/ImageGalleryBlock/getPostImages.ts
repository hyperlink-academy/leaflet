import { ReadTransaction } from "replicache";
import { scanIndex } from "src/replicache/utils";
import { getBlocksWithType } from "src/replicache/getBlocks";

// Every image on a page in document order — standalone image blocks and each
// gallery's children flattened inline. Read once when a standalone image's
// lightbox opens so it can page through the whole post; galleries keep their
// own local lightbox and only contribute images here.
export async function getPostImageEntities(
  tx: ReadTransaction,
  pageEntity: string,
): Promise<string[]> {
  let blocks = await getBlocksWithType(tx, pageEntity);
  if (!blocks) return [];
  let scan = scanIndex(tx);
  let result: string[] = [];
  for (let b of blocks) {
    if (b.type === "image") result.push(b.value);
    else if (b.type === "image-gallery") {
      let images = (await scan.eav(b.value, "gallery/image")).sort((x, y) =>
        x.data.position > y.data.position ? 1 : -1,
      );
      for (let image of images) result.push(image.data.value);
    }
  }
  return result;
}
