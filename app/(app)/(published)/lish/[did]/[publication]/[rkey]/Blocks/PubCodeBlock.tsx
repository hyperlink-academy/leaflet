"use client";

import { PubLeafletBlocksCode } from "lexicons/api";
import { useLayoutEffect, useState } from "react";

export function PubCodeBlock({
  block,
  prerenderedCode,
}: {
  block: PubLeafletBlocksCode.Main;
  prerenderedCode?: string;
}) {
  const [html, setHTML] = useState<string | null>(null);

  // Shiki is a megabyte of languages and themes; it's only worth loading when
  // the server didn't already highlight this block.
  useLayoutEffect(() => {
    if (prerenderedCode) return;
    let stale = false;
    void import("shiki").then(
      ({ codeToHtml, bundledLanguagesInfo, bundledThemesInfo }) => {
        const lang =
          bundledLanguagesInfo.find((l) => l.id === block.language)?.id ||
          "plaintext";
        const theme =
          bundledThemesInfo.find((t) => t.id === block.syntaxHighlightingTheme)
            ?.id || "github-light";
        return codeToHtml(block.plaintext, { lang, theme }).then((h) => {
          if (!stale) setHTML(h);
        });
      },
    );
    return () => {
      stale = true;
    };
  }, [block, prerenderedCode]);
  return (
    <div
      className="w-full min-h-[42px] my-2 rounded-md border-border-light outline-border-light selected-outline"
      dangerouslySetInnerHTML={{ __html: prerenderedCode || html || "" }}
    />
  );
}
