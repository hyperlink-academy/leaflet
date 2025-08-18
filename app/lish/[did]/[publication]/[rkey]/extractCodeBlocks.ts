import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletBlocksCode,
} from "lexicons/api";
import { codeToHtml } from "shiki";

export async function extractCodeBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[],
): Promise<Map<string, string>> {
  const codeBlocks = new Map<string, string>();

  // Process all pages in the document
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const currentIndex = [i];
    const indexKey = currentIndex.join(".");

    if (PubLeafletBlocksCode.isMain(block.block)) {
      const html = await codeToHtml(block.block.plaintext, {
        lang: block.block.language || "plaintext",
        theme: block.block.syntaxHighlightingTheme || "github-light",
      });
      codeBlocks.set(indexKey, html);
    }
  }

  return codeBlocks;
}
