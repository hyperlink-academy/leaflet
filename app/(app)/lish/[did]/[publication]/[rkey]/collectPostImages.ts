import {
  PubLeafletBlocksImage,
  PubLeafletBlocksImageGallery,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksOrderedList,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { GalleryImage } from "components/Blocks/ImageGalleryBlock/shared";

// Collect every image in the post in document order — standalone image blocks
// and each gallery's children flattened inline — so a standalone image's
// lightbox can page through the whole post. Image blocks are keyed by their
// index-path so each one can find its position in the flattened list; galleries
// only contribute images, they keep their own local lightbox.
export function collectPostImages(
  blocks: { block: PubLeafletPagesLinearDocument.Block["block"] }[],
  did: string,
): { images: GalleryImage[]; offsets: Map<string, number> } {
  let images: GalleryImage[] = [];
  let offsets = new Map<string, number>();

  let walkBlock = (
    b: { block: PubLeafletPagesLinearDocument.Block["block"] },
    path: number[],
  ) => {
    let block = b.block;
    if (PubLeafletBlocksImage.isMain(block)) {
      offsets.set(path.join("."), images.length);
      images.push({
        src: blobRefToSrc(block.image.ref, did),
        alt: block.alt || "",
        width: block.aspectRatio?.width ?? 0,
        height: block.aspectRatio?.height ?? 0,
      });
    } else if (PubLeafletBlocksImageGallery.isMain(block)) {
      for (let i of block.images)
        images.push({
          src: blobRefToSrc(i.image.ref, did),
          alt: i.alt || "",
          width: i.aspectRatio.width,
          height: i.aspectRatio.height,
        });
    } else if (PubLeafletBlocksUnorderedList.isMain(block)) {
      block.children.forEach((child, i) =>
        walkListItem(child, [...path, i], false),
      );
    } else if (PubLeafletBlocksOrderedList.isMain(block)) {
      block.children.forEach((child, i) =>
        walkListItem(child, [...path, i], true),
      );
    }
  };

  // A list item renders its content block at its own path, then nests its
  // children one level deeper — mirroring how ListItem/OrderedListItem build
  // the `index` prop so the keys here line up with the rendered blocks.
  let walkListItem = (
    item:
      | PubLeafletBlocksUnorderedList.ListItem
      | PubLeafletBlocksOrderedList.ListItem,
    path: number[],
    ordered: boolean,
  ) => {
    walkBlock({ block: item.content }, path);
    let sameKind = item.children ?? [];
    sameKind.forEach((child, i) => walkListItem(child, [...path, i], ordered));
    let otherKind = ordered
      ? ((item as PubLeafletBlocksOrderedList.ListItem).unorderedListChildren
          ?.children ?? [])
      : ((item as PubLeafletBlocksUnorderedList.ListItem).orderedListChildren
          ?.children ?? []);
    otherKind.forEach((child, i) => walkListItem(child, [...path, i], !ordered));
  };

  blocks.forEach((b, i) => walkBlock(b, [i]));
  return { images, offsets };
}
