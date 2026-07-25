import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { getBlockStructureMirror } from "src/replicache/blockMirror";
import { getBlocksFromMirror } from "src/replicache/getBlocks";

// Every image on a page in document order — standalone image blocks and each
// gallery's children flattened inline. Read once when a standalone image's
// lightbox opens so it can page through the whole post; galleries keep their
// own local lightbox and only contribute images here.
export function getPostImageEntities(
  rep: Replicache<ReplicacheMutators>,
  pageEntity: string,
): string[] {
  let mirror = getBlockStructureMirror(rep);
  let blocks = getBlocksFromMirror(mirror, pageEntity);
  let result: string[] = [];
  for (let b of blocks) {
    if (b.type === "image") result.push(b.value);
    else if (b.type === "image-gallery") {
      let images = mirror
        .eav(b.value, "gallery/image")
        .toSorted((x, y) => (x.data.position > y.data.position ? 1 : -1));
      for (let image of images) result.push(image.data.value);
    }
  }
  return result;
}
