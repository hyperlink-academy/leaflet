import type { Block } from "components/Blocks/Block";

export function parseBlocksToList(blocks: Block[]) {
  let parsed: ParsedBlocks = [];
  for (let i = 0; i < blocks.length; i++) {
    let b = blocks[i];
    if (!b.listData) parsed.push({ type: "block", block: b });
    else {
      let previousBlock = parsed[parsed.length - 1];
      if (
        !previousBlock ||
        previousBlock.type !== "list" ||
        previousBlock.depth > b.listData.depth
      )
        parsed.push({
          type: "list",
          depth: b.listData.depth,
          children: [
            {
              type: "list",
              block: b,
              depth: b.listData.depth,
              children: [],
            },
          ],
        });
      else {
        let depth = b.listData.depth;
        if (depth === previousBlock.depth)
          previousBlock.children.push({
            type: "list",
            block: b,
            depth: b.listData.depth,
            children: [],
          });
        else {
          let parent =
            previousBlock.children[previousBlock.children.length - 1];
          while (depth > 1) {
            if (
              parent.children[parent.children.length - 1] &&
              parent.children[parent.children.length - 1].depth <
                b.listData.depth
            ) {
              parent = parent.children[parent.children.length - 1];
            }
            depth -= 1;
          }
          parent.children.push({
            type: "list",
            block: b,
            depth: b.listData.depth,
            children: [],
          });
        }
      }
    }
  }
  return parsed;
}

type ParsedBlocks = Array<
  | { type: "block"; block: Block }
  | { type: "list"; depth: number; children: List[] }
>;

export type List = {
  type: "list";
  block: Block;
  depth: number;
  children: List[];
};
