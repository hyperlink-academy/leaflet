import type { NormalizedDocument } from "src/utils/normalizeRecords";
import type { PubLeafletContent } from "lexicons/api";

export function getFirstParagraph(
  doc: NormalizedDocument,
): string | undefined {
  let content = doc.content;
  if (!content || !("pages" in content)) return;
  let pages = (content as PubLeafletContent.Main).pages;
  if (!pages?.[0]) return;
  let page = pages[0];
  if (!("blocks" in page)) return;
  for (let blockWrapper of (page as { blocks: { block: any }[] }).blocks) {
    let block = blockWrapper.block;
    if (block?.$type === "pub.leaflet.blocks.text" && block.plaintext) {
      return block.plaintext;
    }
  }
}
