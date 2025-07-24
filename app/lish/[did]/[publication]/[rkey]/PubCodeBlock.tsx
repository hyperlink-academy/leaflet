"use client";

import { PubLeafletBlocksCode } from "lexicons/api";
import { useLayoutEffect, useState } from "react";
import { codeToHtml } from "shiki";

export function PubCodeBlock({
  block,
  prerenderedCode,
}: {
  block: PubLeafletBlocksCode.Main;
  prerenderedCode?: string;
}) {
  const [html, setHTML] = useState<string | null>(prerenderedCode || null);

  useLayoutEffect(() => {
    codeToHtml(block.plaintext, {
      lang: block.language || "plaintext",
      theme: block.syntaxHighlightingTheme || "github-light",
    }).then(setHTML);
  }, [block]);
  return (
    <div
      className="w-full min-h-[42px] rounded-md border-border-light outline-border-light selected-outline"
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}
