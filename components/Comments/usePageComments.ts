import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";
import { useEntitySetContext } from "components/EntitySetProvider";

export type CommentInfo = {
  commentEntityID: string;
  blockID: string;
};

export function usePageComments(pageID: string) {
  let rep = useReplicache();
  let { permissions } = useEntitySetContext();
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

      let comments: CommentInfo[] = [];
      for (let block of sorted) {
        let blockComments = await scan.eav(block.value, "block/comment");
        let sortedComments = blockComments.toSorted((a, b) =>
          a.data.position > b.data.position ? 1 : -1,
        );
        for (let c of sortedComments) {
          comments.push({
            commentEntityID: c.data.value,
            blockID: block.value,
          });
        }
      }

      return { pageID, comments };
    },
    { dependencies: [pageID] },
  );

  // Read-only viewers don't see comments at all, so hand downstream consumers
  // (side column, sheet, popover) an empty set
  if (!permissions.write)
    return {
      pageID,
      comments: [] as CommentInfo[],
    };

  return (
    data || {
      pageID,
      comments: [] as CommentInfo[],
    }
  );
}
