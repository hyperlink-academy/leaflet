import { AtUri } from "@atproto/syntax";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import type {
  NormalizedDocument,
  NormalizedPublication,
} from "src/utils/normalizeRecords";

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

/**
 * Builds the list of canonical/known URLs that point to a given document.
 * Mirrors the URLs a Bluesky post might link to when referencing the doc.
 */
export function getDocumentUrls(
  doc: NormalizedDocument,
  docUri: string,
  publication?: NormalizedPublication | null,
): string[] {
  const urls: string[] = [];
  const docAtUri = new AtUri(docUri);

  const canonicalUrl = getDocumentURL(doc, docUri, publication);
  if (canonicalUrl.startsWith("http")) {
    urls.push(canonicalUrl);
  } else {
    urls.push(`https://leaflet.pub${canonicalUrl}`);
  }
  urls.push(`https://leaflet.pub/p/${docAtUri.host}/${docAtUri.rkey}`);
  if (doc.site && doc.site.startsWith("http")) {
    const path = doc.path || "/" + docAtUri.rkey;
    urls.push(doc.site + path);
  }
  return urls;
}

/**
 * Check if a URL matches any of the document's known URLs,
 * and extract the quote position if present.
 */
export function matchDocumentUrl(
  uri: string,
  documentUrls: string[],
): { url: string; quotePosition: QuotePosition | null } | null {
  try {
    const url = new URL(uri);
    const parts = url.pathname.split("/l-quote/");
    const pathWithoutQuote = parts[0];
    const quoteParam = parts[1];
    const fullUrlWithoutQuote = (url.origin + pathWithoutQuote).replace(
      /\/$/,
      "",
    );

    for (const docUrl of documentUrls) {
      const normalized = docUrl.replace(/\/$/, "");
      if (fullUrlWithoutQuote === normalized) {
        return {
          url: uri,
          quotePosition: quoteParam ? decodeQuotePosition(quoteParam) : null,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}
