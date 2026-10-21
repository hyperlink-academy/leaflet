import {
  getDocumentPages,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import { pageBlocksInOrder } from "src/utils/pageBlocksInOrder";

export function findDocumentBlocks<B = { $type: string; key?: string }>(
  document: NormalizedDocument | null | undefined,
  type: string,
): B[] {
  const found: B[] = [];
  for (const page of (document && getDocumentPages(document)) ?? [])
    for (const b of pageBlocksInOrder(page))
      if (b.block.block.$type === type) found.push(b.block.block as B);
  return found;
}

export function documentHasBlock(document: NormalizedDocument, type: string) {
  return findDocumentBlocks(document, type).length > 0;
}

// The block of a type that an interaction record naming block key `key`
// belongs to. Records from before a document had several such blocks name
// none, and a key whose block was since deleted names nothing that exists:
// both fall to the first block, so nothing disappears.
export function resolveInteractionBlock<B extends { key?: string }>(
  blocks: B[],
  key: string | null | undefined,
): B | null {
  return blocks.find((b) => key && b.key === key) ?? blocks[0] ?? null;
}
