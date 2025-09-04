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

export const QUOTE_PARAM = "/l-quote/";

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
