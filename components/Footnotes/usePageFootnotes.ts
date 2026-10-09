import {
  BlockStructureMirror,
  blockListAttributes,
} from "src/replicache/blockMirror";
import { getPageReadingOrder } from "src/replicache/getBlocks";
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
  // getPageReadingOrder flattens nested list items into document order, so
  // footnotes inside (nested) list items are numbered with everything else.
  let sorted = getPageReadingOrder(mirror, pageID);

  let footnotes: FootnoteInfo[] = [];
  let indexMap: Record<string, number> = {};
  let idx = 1;

  for (let block of sorted) {
    let blockFootnotes = mirror.eav(block.entityID, "block/footnote");
    let sortedFootnotes = blockFootnotes.toSorted((a, b) =>
      a.data.position > b.data.position ? 1 : -1,
    );
    for (let fn of sortedFootnotes) {
      footnotes.push({
        footnoteEntityID: fn.data.value,
        blockID: block.entityID,
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
