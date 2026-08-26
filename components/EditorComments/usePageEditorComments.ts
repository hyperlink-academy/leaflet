import {
  BlockStructureMirror,
  blockListAttributes,
} from "src/replicache/blockMirror";
import { getBlocksFromMirror } from "src/replicache/getBlocks";
import { useMirrorQuery } from "src/hooks/useMirrorQuery";
import { useEntitySetContext } from "components/EntitySetProvider";

export type EditorCommentInfo = {
  commentEntityID: string;
  blockID: string;
};

type PageEditorComments = {
  pageID: string;
  comments: EditorCommentInfo[];
};

// Everything that changes which comments a page has or their order: block
// order (the block-list attributes and canvas positions) and the comments
// themselves.
const relevantAttributes = [
  ...blockListAttributes,
  "canvas/block",
  "block/comment",
];

function computeComments(
  mirror: BlockStructureMirror,
  pageID: string,
): PageEditorComments {
  // getBlocksFromMirror flattens nested list items into document order, so
  // comments on nested list items are found along with everything else.
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

  let comments: EditorCommentInfo[] = [];
  for (let block of sorted) {
    let blockComments = mirror.eav(block.value, "block/comment");
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
}

export function usePageEditorComments(pageID: string): PageEditorComments {
  let { permissions } = useEntitySetContext();
  let data = useMirrorQuery(
    relevantAttributes,
    (mirror) => computeComments(mirror, pageID),
    [pageID],
  );

  // Read-only viewers don't see comments at all, so hand downstream consumers
  // (side column, sheet, popover) an empty set
  if (!permissions.write || !data) return { pageID, comments: [] };
  return data;
}
