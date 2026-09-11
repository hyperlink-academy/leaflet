import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
  PubLeafletBlocksCode,
  PubLeafletBlocksMath,
} from "lexicons/api";
import { codeToHtml, bundledLanguagesInfo, bundledThemesInfo } from "shiki";
import Katex from "katex";

export async function extractPrerenderedBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[] | PubLeafletPagesCanvas.Block[],
): Promise<Map<string, string>> {
  const prerendered = new Map<string, string>();

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
      prerendered.set(indexKey, html);
    }

    if (PubLeafletBlocksMath.isMain(block.block)) {
      prerendered.set(
        indexKey,
        Katex.renderToString(block.block.tex, {
          displayMode: true,
          output: "html",
          throwOnError: false,
        }),
      );
    }
  }

  return prerendered;
}
