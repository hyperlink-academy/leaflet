import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksUnorderedList,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";

export function extractBlocksByType<T extends { $type: string }>(
  blocks: PubLeafletPagesLinearDocument.Block[],
  type: string,
): { block: T }[] {
  const results: { block: T }[] = [];
  for (const b of blocks) {
    if (b.block.$type === type) {
      results.push(b as unknown as { block: T });
    }
    if (
      b.block.$type === ids.PubLeafletBlocksOrderedList ||
      b.block.$type === ids.PubLeafletBlocksUnorderedList
    ) {
      const list = b.block as
        | PubLeafletBlocksOrderedList.Main
        | PubLeafletBlocksUnorderedList.Main;
      extractFromListItems(list.children, type, results);
    }
  }
  return results;
}

function extractFromListItems<T extends { $type: string }>(
  items:
    | PubLeafletBlocksOrderedList.ListItem[]
    | PubLeafletBlocksUnorderedList.ListItem[],
  type: string,
  results: { block: T }[],
) {
  for (const item of items) {
    if ((item.content as { $type?: string })?.$type === type) {
      results.push({ block: item.content as unknown as T });
    }
    if (item.children) {
      extractFromListItems(item.children, type, results);
    }
    const orderedChildren = (item as PubLeafletBlocksUnorderedList.ListItem)
      .orderedListChildren;
    if (orderedChildren) {
      extractFromListItems(orderedChildren.children, type, results);
    }
    const unorderedChildren = (item as PubLeafletBlocksOrderedList.ListItem)
      .unorderedListChildren;
    if (unorderedChildren) {
      extractFromListItems(unorderedChildren.children, type, results);
    }
  }
}
