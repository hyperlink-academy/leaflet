// Generated w/ Claude 4
"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useContext } from "react";
import { PostPageContext } from "./PostPageContext";
import { create } from "zustand";

export interface QuotePosition {
  start: {
    block: number[];
    offset: number;
  };
  end: {
    block: number[];
    offset: number;
  };
}

export const useActiveHighlightState = create(() => ({
  activeHighlight: null as null | number,
}));

export const useHighlight = (pos: number[]) => {
  let doc = useContext(PostPageContext);
  let { quote } = useParams();
  let activeHighlight = useActiveHighlightState(
    (state) => state.activeHighlight,
  );
  let highlights =
    doc?.document_mentions_in_bsky
      .filter((m, i) => i === activeHighlight)
      .map((mention) => {
        return new URL(mention.link).pathname.split("/l-quote/")[1];
      })
      .filter((s) => s !== null) || [];
  if (quote) highlights.push(quote as string);
  return highlights
    .map((highlight) => {
      let quotePosition = decodeQuotePosition(highlight);
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

/**
 * Encodes quote position into a URL-friendly string
 * Format: startBlock_startOffset-endBlock_endOffset
 * Block paths are joined with dots: 1.2.0_45-1.2.3_67
 * Simple blocks: 0:12-2:45
 */
export function encodeQuotePosition(position: QuotePosition): string {
  const { start, end } = position;
  return `${start.block.join(".")}_${start.offset}-${end.block.join(".")}_${end.offset}`;
}

/**
 * Decodes quote position from URL parameter
 * Returns null if the format is invalid
 */
export function decodeQuotePosition(encoded: string): QuotePosition | null {
  try {
    // Match format: blockPath:number-blockPath:number
    // Block paths can be: 5, 1.2, 0.1.3, etc.
    const match = encoded.match(/^([\d.]+)_(\d+)-([\d.]+)_(\d+)$/);

    if (!match) {
      return null;
    }

    const [, startBlockPath, startOffset, endBlockPath, endOffset] = match;

    const position: QuotePosition = {
      start: {
        block: startBlockPath.split(".").map((i) => parseInt(i)),
        offset: parseInt(startOffset, 10),
      },
      end: {
        block: endBlockPath.split(".").map((i) => parseInt(i)),
        offset: parseInt(endOffset, 10),
      },
    };

    return position;
  } catch (error) {
    return null;
  }
}
