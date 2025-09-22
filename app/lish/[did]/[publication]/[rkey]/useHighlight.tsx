// Generated w/ Claude 4
"use client";

import { useParams } from "next/navigation";
import { useContext } from "react";
import { PostPageContext } from "./PostPageContext";
import { create } from "zustand";
import { decodeQuotePosition, QuotePosition } from "./quotePosition";

export const useActiveHighlightState = create(() => ({
  activeHighlight: null as null | QuotePosition,
}));

export const useHighlight = (pos: number[]) => {
  let doc = useContext(PostPageContext);
  let { quote } = useParams();
  let activeHighlight = useActiveHighlightState(
    (state) => state.activeHighlight,
  );
  let highlights = activeHighlight ? [activeHighlight] : [];
  let decodedQuote = quote ? decodeQuotePosition(quote as string) : null;
  if (decodedQuote) highlights.push(decodedQuote);
  console.log(highlights);
  return highlights
    .map((quotePosition) => {
      if (!quotePosition) return null;
      let maxLength = Math.max(
        quotePosition.start.block.length,
        quotePosition.end.block.length,
      );
      let expandedPos = pos.concat(
        Array(Math.max(0, maxLength - pos.length)).fill(-1),
      );
      if (
        !expandedPos.reduce(
          (acc, i, index) =>
            acc &&
            ((i === -1 && quotePosition?.start.block[index] === undefined) ||
              i >= (quotePosition?.start.block[index] ?? -1)) &&
            i <= quotePosition.end.block[index],
          true,
        )
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
