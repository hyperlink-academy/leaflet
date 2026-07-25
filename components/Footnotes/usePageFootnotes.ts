import {
  BlockStructureMirror,
  blockListAttributes,
} from "src/replicache/blockMirror";
import { getBlocksFromMirror } from "src/replicache/getBlocks";
import { useMirrorQuery } from "src/hooks/useMirrorQuery";

export type FootnoteInfo = {
  footnoteEntityID: string;
  blockID: string;
  index: number;
};

type PageFootnotes = {
  pageID: string;
  footnotes: FootnoteInfo[];
  indexMap: Record<string, number>;
};

// Everything that changes footnote numbering: block order (the block-list
// attributes and canvas positions) and the footnotes themselves.
const relevantAttributes = [
  ...blockListAttributes,
  "canvas/block",
  "block/footnote",
];

function computeFootnotes(
  mirror: BlockStructureMirror,
  pageID: string,
): PageFootnotes {
  // getBlocksFromMirror flattens nested list items into document order, so
  // footnotes inside (nested) list items are numbered with everything else.
  let cardBlocks = getBlocksFromMirror(mirror, pageID);
  let canvasBlocks = mirror.eav(pageID, "canvas/block");

  let sortedCanvasBlocks = canvasBlocks
    .map((b) => ({ value: b.data.value, position: b.data.position }))
    .toSorted((a, b) => {
      if (a.position.y === b.position.y) return a.position.x - b.position.x;
      return a.position.y - b.position.y;
    });

  let sorted = [
    ...cardBlocks.map((b) => ({ value: b.entityID })),
    ...sortedCanvasBlocks,
  ];

  let footnotes: FootnoteInfo[] = [];
  let indexMap: Record<string, number> = {};
  let idx = 1;

  for (let block of sorted) {
    let blockFootnotes = mirror.eav(block.value, "block/footnote");
    let sortedFootnotes = blockFootnotes.toSorted((a, b) =>
      a.data.position > b.data.position ? 1 : -1,
    );
    for (let fn of sortedFootnotes) {
      footnotes.push({
        footnoteEntityID: fn.data.value,
        blockID: block.value,
        index: idx,
      });
      indexMap[fn.data.value] = idx;
      idx++;
    }
  }

  return { pageID, footnotes, indexMap };
}

export function usePageFootnotes(pageID: string) {
  let data = useMirrorQuery(
    relevantAttributes,
    (mirror) => computeFootnotes(mirror, pageID),
    [pageID],
  );
  return (
    data || { pageID, footnotes: [], indexMap: {} as Record<string, number> }
  );
}
