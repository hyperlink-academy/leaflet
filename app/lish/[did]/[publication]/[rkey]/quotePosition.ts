export interface QuotePosition {
  pageId?: string;
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
 * Format with page: pageId~startBlock_startOffset-endBlock_endOffset
 * Block paths are joined with dots: 1.2.0_45-1.2.3_67
 * Simple blocks: 0_12-2_45
 * With page: page1~0_12-2_45
 */
export function encodeQuotePosition(position: QuotePosition): string {
  const { pageId, start, end } = position;
  const positionStr = `${start.block.join(".")}_${start.offset}-${end.block.join(".")}_${end.offset}`;
  return pageId ? `${pageId}~${positionStr}` : positionStr;
}

/**
 * Decodes quote position from URL parameter
 * Returns null if the format is invalid
 */
export function decodeQuotePosition(encoded: string): QuotePosition | null {
  try {
    // Check for pageId prefix (format: pageId~blockPath_number-blockPath_number)
    let pageId: string | undefined;
    let positionStr = encoded;

    const tildeIndex = encoded.indexOf("~");
    if (tildeIndex !== -1) {
      pageId = encoded.substring(0, tildeIndex);
      positionStr = encoded.substring(tildeIndex + 1);
    }

    // Match format: blockPath_number-blockPath_number
    // Block paths can be: 5, 1.2, 0.1.3, etc.
    const match = positionStr.match(/^([\d.]+)_(\d+)-([\d.]+)_(\d+)$/);

    if (!match) {
      return null;
    }

    const [, startBlockPath, startOffset, endBlockPath, endOffset] = match;

    const position: QuotePosition = {
      ...(pageId && { pageId }),
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
