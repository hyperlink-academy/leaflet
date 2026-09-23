import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
  PubLeafletBlocksCode,
} from "lexicons/api";
import { pageBlocksInOrder } from "src/utils/pageBlocksInOrder";
import { codeToHtml, bundledLanguagesInfo, bundledThemesInfo } from "shiki";

// Keyed by the block's rendered index path (see pageBlocksInOrder), which is
// what PostContent and CanvasPage look prerendered code up by.
export async function extractCodeBlocks(
  page: PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main,
): Promise<Map<string, string>> {
  const codeBlocks = new Map<string, string>();

  for (const { block, index } of pageBlocksInOrder(page)) {
    if (PubLeafletBlocksCode.isMain(block.block)) {
      let { language, syntaxHighlightingTheme } = block.block;
      const lang =
        bundledLanguagesInfo.find((l) => l.id === language)?.id || "plaintext";
      let theme =
        bundledThemesInfo.find((t) => t.id === syntaxHighlightingTheme)?.id ||
        "github-light";

      const html = await codeToHtml(block.block.plaintext, { lang, theme });
      codeBlocks.set(index.join("."), html);
    }
  }

  return codeBlocks;
}
