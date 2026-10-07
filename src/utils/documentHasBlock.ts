import {
  getDocumentPages,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import { pageBlocksInOrder } from "src/utils/pageBlocksInOrder";

export function documentHasBlock(document: NormalizedDocument, type: string) {
  return (getDocumentPages(document) ?? []).some((page) =>
    pageBlocksInOrder(page).some((b) => b.block.block.$type === type),
  );
}
