import {
  PubLeafletBlocksImage,
  PubLeafletBlocksImageGallery,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksOrderedList,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { GalleryImage } from "components/Blocks/ImageGalleryBlock/shared";

// Canvas blocks render in visual order; sharing the comparator keeps the
// lightbox paging through canvas images in the same order they appear.
export function canvasBlockOrder(
  a: PubLeafletPagesCanvas.Block,
  b: PubLeafletPagesCanvas.Block,
) {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

// Collect every image on a page in document order — standalone image blocks and
// each gallery's children flattened inline — so a standalone image's lightbox
// can page through them all. The clicked image is found by src, so galleries
// only contribute images; they keep their own local lightbox.
export function collectPostImages(
  page: PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main,
  did: string,
): GalleryImage[] {
  let blocks = PubLeafletPagesCanvas.isMain(page)
    ? [...(page.blocks || [])]
        .sort(canvasBlockOrder)
        .map((b) => ({ block: b.block }))
    : (page.blocks ?? []);
  let images: GalleryImage[] = [];

  let walkBlock = (b: {
    block: PubLeafletPagesLinearDocument.Block["block"];
  }) => {
    let block = b.block;
    if (PubLeafletBlocksImage.isMain(block)) {
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
      block.children.forEach((child) => walkListItem(child, false));
    } else if (PubLeafletBlocksOrderedList.isMain(block)) {
      block.children.forEach((child) => walkListItem(child, true));
    }
  };

  let walkListItem = (
    item:
      | PubLeafletBlocksUnorderedList.ListItem
      | PubLeafletBlocksOrderedList.ListItem,
    ordered: boolean,
  ) => {
    walkBlock({ block: item.content });
    (item.children ?? []).forEach((child) => walkListItem(child, ordered));
    let otherKind = ordered
      ? ((item as PubLeafletBlocksOrderedList.ListItem).unorderedListChildren
          ?.children ?? [])
      : ((item as PubLeafletBlocksUnorderedList.ListItem).orderedListChildren
          ?.children ?? []);
    otherKind.forEach((child) => walkListItem(child, !ordered));
  };

  blocks.forEach((b) => walkBlock(b));
  return images;
}
