// Generated w/ Claude 4
"use client";

import { useParams } from "next/navigation";
import { create } from "zustand";
import {
  compareQuoteBlockPaths,
  decodeQuotePosition,
  QuotePosition,
} from "src/utils/quotePosition";

export const useActiveHighlightState = create(() => ({
  activeHighlight: null as null | QuotePosition,
}));

export const useHighlight = (pos: number[], pageId?: string) => {
  let { quote } = useParams();
  let activeHighlight = useActiveHighlightState(
    (state) => state.activeHighlight,
  );
  let highlights = activeHighlight ? [activeHighlight] : [];
  let decodedQuote = quote ? decodeQuotePosition(quote as string) : null;
  if (decodedQuote) highlights.push(decodedQuote);
  return highlights
    .map((quotePosition) => {
      if (!quotePosition) return null;
      // Filter by pageId if provided
      if (pageId && quotePosition.pageId !== pageId) {
        return null;
      }
      // If highlight has pageId but block doesn't, skip
      if (quotePosition.pageId && !pageId) {
        return null;
      }
      if (
        compareQuoteBlockPaths(pos, quotePosition.start.block) < 0 ||
        compareQuoteBlockPaths(pos, quotePosition.end.block) > 0
      ) {
        return null;
      }
      let startOffset: number | null = null;
      let endOffset: number | null = null;
      if (
        pos.length === quotePosition.start.block.length &&
        pos.every((val, index) => val === quotePosition.start.block[index])
      ) {
        startOffset = quotePosition.start.offset;
      }

      if (
        pos.length === quotePosition.end.block.length &&
        pos.every((val, index) => val === quotePosition.end.block[index])
      ) {
        endOffset = quotePosition.end.offset;
      }
      return { startOffset, endOffset };
    })
    .filter((highlight) => highlight !== null);
};
