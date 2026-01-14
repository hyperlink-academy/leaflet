import { AtUri } from "@atproto/api";
import {
  isDocumentCollection,
  isPublicationCollection,
} from "src/utils/collectionHelpers";

/**
 * Converts a DID to a Bluesky profile URL
 */
export function didToBlueskyUrl(did: string): string {
  return `https://bsky.app/profile/${did}`;
}

/**
 * Converts an AT URI (publication or document) to the appropriate URL
 */
export function atUriToUrl(atUri: string): string {
  try {
    const uri = new AtUri(atUri);

    if (isPublicationCollection(uri.collection)) {
      // Publication URL: /lish/{did}/{rkey}
      return `/lish/${uri.host}/${uri.rkey}`;
    } else if (isDocumentCollection(uri.collection)) {
      // Document URL - we need to resolve this via the API
      // For now, create a redirect route that will handle it
      return `/lish/uri/${encodeURIComponent(atUri)}`;
    }

    return "#";
  } catch (e) {
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
  value: string
) {
  e.preventDefault();
  e.stopPropagation();

  if (type === "did") {
    // Open Bluesky profile in new tab
    window.open(didToBlueskyUrl(value), "_blank", "noopener,noreferrer");
  } else {
    // Navigate to publication/document in same tab
    const url = atUriToUrl(value);
    if (url.startsWith("/lish/uri/")) {
      // Redirect route - navigate to it
      window.location.href = url;
    } else {
      window.location.href = url;
    }
  }
}
