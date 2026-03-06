import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";

export type FootnoteInfo = {
  footnoteEntityID: string;
  blockID: string;
  index: number;
};

export function usePageFootnotes(pageID: string) {
  let rep = useReplicache();
  let data = useSubscribe(
    rep?.rep,
    async (tx) => {
      let scan = scanIndex(tx);
      let cardBlocks = await scan.eav(pageID, "card/block");
      let canvasBlocks = await scan.eav(pageID, "canvas/block");

      let sortedCardBlocks = cardBlocks
        .map((b) => ({ value: b.data.value, position: b.data.position }))
        .toSorted((a, b) => (a.position > b.position ? 1 : -1));

      let sortedCanvasBlocks = canvasBlocks
        .map((b) => ({ value: b.data.value, position: b.data.position }))
        .toSorted((a, b) => {
          if (a.position.y === b.position.y) return a.position.x - b.position.x;
          return a.position.y - b.position.y;
        });

      let sorted = [...sortedCardBlocks, ...sortedCanvasBlocks];

      let footnotes: FootnoteInfo[] = [];
      let indexMap: Record<string, number> = {};
      let idx = 1;

      for (let block of sorted) {
        let blockFootnotes = await scan.eav(block.value, "block/footnote");
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
    },
    { dependencies: [pageID] },
  );

  return (
    data || { pageID, footnotes: [], indexMap: {} as Record<string, number> }
  );
}
