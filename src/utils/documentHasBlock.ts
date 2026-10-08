import {
  getDocumentPages,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import { pageBlocksInOrder } from "src/utils/pageBlocksInOrder";

export function findDocumentBlock(document: NormalizedDocument, type: string) {
  for (const page of getDocumentPages(document) ?? [])
    for (const b of pageBlocksInOrder(page))
      if (b.block.block.$type === type) return b.block.block;
  return null;
}

export function documentHasBlock(document: NormalizedDocument, type: string) {
  return !!findDocumentBlock(document, type);
}
