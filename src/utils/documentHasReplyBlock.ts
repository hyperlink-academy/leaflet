import { ids } from "lexicons/api/lexicons";
import {
  getDocumentPages,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import { pageBlocksInOrder } from "src/utils/pageBlocksInOrder";

export function documentHasReplyBlock(document: NormalizedDocument) {
  return (getDocumentPages(document) ?? []).some((page) =>
    pageBlocksInOrder(page).some(
      (b) => b.block.block.$type === ids.PubLeafletBlocksReply,
    ),
  );
}
