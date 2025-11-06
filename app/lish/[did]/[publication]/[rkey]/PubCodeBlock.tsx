"use client";

import { PubLeafletBlocksCode } from "lexicons/api";
import { useLayoutEffect, useState } from "react";
import { codeToHtml, bundledLanguagesInfo, bundledThemesInfo } from "shiki";

export function PubCodeBlock({
  block,
  prerenderedCode,
}: {
  block: PubLeafletBlocksCode.Main;
  prerenderedCode?: string;
}) {
  const [html, setHTML] = useState<string | null>(prerenderedCode || null);

  useLayoutEffect(() => {
    const lang = bundledLanguagesInfo.find((l) => l.id === block.language)?.id || "plaintext";
    const theme = bundledThemesInfo.find((t) => t.id === block.syntaxHighlightingTheme)?.id || "github-light";

    codeToHtml(block.plaintext, { lang, theme }).then(setHTML);
  }, [block]);
  return (
    <div
      className="w-full min-h-[42px] my-2 rounded-md border-border-light outline-border-light selected-outline"
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}
