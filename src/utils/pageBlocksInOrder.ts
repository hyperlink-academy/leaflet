import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { canvasBlockOrder } from "src/utils/canvasBlockOrder";

export type IndexedBlock = {
  block: PubLeafletPagesLinearDocument.Block;
  index: number[];
};

// The blocks a canvas block renders, with the index paths PostContent and
// CanvasPage render them at: a linear-document group's blocks indexed under
// the group's canvas index `i`, a lone block wrapped as a linear-document
// block at [i].
export function canvasBlockBlocks(
  canvasBlock: PubLeafletPagesCanvas.Block,
  i: number,
): IndexedBlock[] {
  if (PubLeafletPagesLinearDocument.isMain(canvasBlock.block))
    return (canvasBlock.block.blocks ?? []).map((block, j) => ({
      block,
      index: [i, j],
    }));
  return [
    {
      block: {
        $type: "pub.leaflet.pages.linearDocument#block" as const,
        block: canvasBlock.block,
      },
      index: [i],
    },
  ];
}

// A page's top-level blocks in reading order with their index paths, which
// block ids, quote positions and prerendered code keys are all counted
// against. Canvas blocks are taken in canvasBlockOrder.
export function pageBlocksInOrder(
  page:
    | PubLeafletPagesLinearDocument.Main
    | PubLeafletPagesCanvas.Main
    | { $type: string },
): IndexedBlock[] {
  if (!PubLeafletPagesCanvas.isMain(page))
    return ((page as PubLeafletPagesLinearDocument.Main).blocks ?? []).map(
      (block, i) => ({ block, index: [i] }),
    );
  return [...(page.blocks ?? [])]
    .sort(canvasBlockOrder)
    .flatMap(canvasBlockBlocks);
}
