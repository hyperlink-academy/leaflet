import { AtUri } from "@atproto/api";
import {
  isDocumentCollection,
  isPublicationCollection,
} from "src/utils/collectionHelpers";

/**
 * Safely classifies an AT URI string as publication, document, or unknown.
 * Returns { isPublication: false, isDocument: false } for invalid/external URIs.
 */
export function classifyAtUri(atURI: string): {
  isPublication: boolean;
  isDocument: boolean;
} {
  try {
    const uri = new AtUri(atURI);
    return {
      isPublication: isPublicationCollection(uri.collection),
      isDocument: isDocumentCollection(uri.collection),
    };
  } catch {
    return { isPublication: false, isDocument: false };
  }
}

/**
 * Converts a DID to a Bluesky profile URL
 */
export function didToBlueskyUrl(did: string): string {
  return `https://bsky.app/profile/${did}`;
}

function tryAsHttpUrl(str: string): string | null {
  try {
    const url = new URL(str);
    if (url.protocol === "http:" || url.protocol === "https:") return str;
  } catch {
    // Not a valid URL
  }
  return null;
}

/**
 * Converts an AT URI (publication or document) to the appropriate URL
 */
export function atUriToUrl(atUri: string): string {
  try {
    const uri = new AtUri(atUri);

    if (isPublicationCollection(uri.collection) || isDocumentCollection(uri.collection)) {
      return `/lish/uri/${encodeURIComponent(atUri)}`;
    }

    return tryAsHttpUrl(atUri) ?? "#";
  } catch (e) {
    const httpUrl = tryAsHttpUrl(atUri);
    if (httpUrl) return httpUrl;
    console.error("Failed to parse AT URI:", atUri, e);
    return "#";
  }
}

/**
 * Opens a mention link in the appropriate way
 * - DID mentions open in a new tab (external Bluesky)
 * - Publication/document mentions navigate in the same tab
 */
export function handleMentionClick(
  e: MouseEvent | React.MouseEvent,
  type: "did" | "at-uri",
  value: string,
) {
  e.preventDefault();
  e.stopPropagation();

  if (type === "did") {
    // Open Bluesky profile in new tab
    window.open(didToBlueskyUrl(value), "_blank", "noopener,noreferrer");
  } else {
    // Navigate to publication/document in same tab
    window.location.href = atUriToUrl(value);
  }
}
