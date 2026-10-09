import {
  PubLeafletBlocksHeader,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { canvasBlockOrder } from "./canvasBlockOrder";

export type PageRecordTextBlock =
  | PubLeafletBlocksText.Main
  | PubLeafletBlocksHeader.Main;

// Structural shape shared by ordered and unordered list items.
type ListItem = {
  content: unknown;
  children?: ListItem[];
  orderedListChildren?: { children: ListItem[] };
  unorderedListChildren?: { children: ListItem[] };
};

// The first text-ish blocks of a page record in reading order, used as a page
// link's title/preview lines. Descends into list items so the record matches
// the editor's flattened block list, where a leading bullet is the title.
export function pageRecordTextBlocks(
  blocks:
    | PubLeafletPagesLinearDocument.Block[]
    | PubLeafletPagesCanvas.Block[]
    | undefined,
  opts: { isCanvas?: boolean; limit: number },
): PageRecordTextBlock[] {
  if (!blocks) return [];
  let ordered = opts.isCanvas
    ? [...(blocks as PubLeafletPagesCanvas.Block[])].sort(canvasBlockOrder)
    : blocks;
  let out: PageRecordTextBlock[] = [];
  for (let b of ordered)
    for (let text of textBlocks(b.block)) {
      out.push(text);
      if (out.length >= opts.limit) return out;
    }
  return out;
}

function* textBlocks(block: unknown): Generator<PageRecordTextBlock> {
  if (
    PubLeafletBlocksText.isMain(block) ||
    PubLeafletBlocksHeader.isMain(block)
  )
    yield block as PageRecordTextBlock;
  else if (
    PubLeafletBlocksUnorderedList.isMain(block) ||
    PubLeafletBlocksOrderedList.isMain(block)
  )
    yield* listItemTextBlocks(
      (block as { children?: ListItem[] }).children ?? [],
    );
  else if (PubLeafletPagesLinearDocument.isMain(block))
    for (let b of (block as PubLeafletPagesLinearDocument.Main).blocks ?? [])
      yield* textBlocks(b.block);
}

function* listItemTextBlocks(
  items: ListItem[],
): Generator<PageRecordTextBlock> {
  for (let item of items) {
    yield* textBlocks(item.content);
    let nested =
      item.children ??
      item.orderedListChildren?.children ??
      item.unorderedListChildren?.children;
    if (nested) yield* listItemTextBlocks(nested);
  }
}
