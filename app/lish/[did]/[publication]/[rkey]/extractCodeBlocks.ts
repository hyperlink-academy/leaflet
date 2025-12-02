import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
  PubLeafletBlocksCode,
} from "lexicons/api";
import { codeToHtml, bundledLanguagesInfo, bundledThemesInfo } from "shiki";

export async function extractCodeBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[] | PubLeafletPagesCanvas.Block[],
): Promise<Map<string, string>> {
  const codeBlocks = new Map<string, string>();

  // Process all blocks (works for both linear and canvas)
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const currentIndex = [i];
    const indexKey = currentIndex.join(".");

    if (PubLeafletBlocksCode.isMain(block.block)) {
      let { language, syntaxHighlightingTheme } = block.block;
      const lang =
        bundledLanguagesInfo.find((l) => l.id === language)?.id || "plaintext";
      let theme =
        bundledThemesInfo.find((t) => t.id === syntaxHighlightingTheme)?.id ||
        "github-light";

      const html = await codeToHtml(block.block.plaintext, { lang, theme });
      codeBlocks.set(indexKey, html);
    }
  }

  return codeBlocks;
}
