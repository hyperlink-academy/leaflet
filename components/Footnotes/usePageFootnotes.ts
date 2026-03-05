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
      let blocks = await scan.eav(pageID, "card/block");
      let sorted = blocks.toSorted((a, b) =>
        a.data.position > b.data.position ? 1 : -1,
      );

      let footnotes: FootnoteInfo[] = [];
      let indexMap: Record<string, number> = {};
      let idx = 1;

      for (let block of sorted) {
        let blockFootnotes = await scan.eav(block.data.value, "block/footnote");
        let sortedFootnotes = blockFootnotes.toSorted((a, b) =>
          a.data.position > b.data.position ? 1 : -1,
        );
        for (let fn of sortedFootnotes) {
          footnotes.push({
            footnoteEntityID: fn.data.value,
            blockID: block.data.value,
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

  return data || { pageID, footnotes: [], indexMap: {} as Record<string, number> };
}
