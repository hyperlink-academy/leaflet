import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";

export type CommentInfo = {
  commentEntityID: string;
  blockID: string;
};

export function usePageComments(pageID: string) {
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

      let comments: CommentInfo[] = [];
      let resolvedCommentIDs: string[] = [];
      for (let block of sorted) {
        let blockComments = await scan.eav(block.value, "block/comment");
        let sortedComments = blockComments.toSorted((a, b) =>
          a.data.position > b.data.position ? 1 : -1,
        );
        for (let c of sortedComments) {
          let resolved = await scan.eav(c.data.value, "comment/resolved");
          if (resolved[0]?.data.value) {
            resolvedCommentIDs.push(c.data.value);
          } else {
            comments.push({
              commentEntityID: c.data.value,
              blockID: block.value,
            });
          }
        }
      }

      return { pageID, comments, resolvedCommentIDs };
    },
    { dependencies: [pageID] },
  );

  return (
    data || {
      pageID,
      comments: [] as CommentInfo[],
      resolvedCommentIDs: [] as string[],
    }
  );
}
