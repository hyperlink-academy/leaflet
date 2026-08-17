import type { Metadata } from "next";
import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { getPublicationURL } from "src/utils/getPublicationURL";

// Canonical + feed discovery links for a public publication page. Set from
// each public page's generateMetadata rather than the publication layout so
// utility routes (/dashboard, /edit, /subscribe, ...) don't inherit a
// canonical claiming they're publication content.
//
// Legacy pub.leaflet publications without a configured domain don't normalize
// (no URL) but are still browsable at leaflet.pub/lish/… — pass `pub` so they
// canonicalize there instead of shipping no canonical or feeds.
export function publicationAlternates(
  pubRecord: NormalizedPublication | null | undefined,
  path: string,
  pub?: { uri: string; record: unknown },
): Metadata["alternates"] {
  let base = pubRecord?.url;
  if (!base && pub) {
    let url = getPublicationURL(pub);
    base = url.startsWith("/") ? `https://leaflet.pub${url}` : url;
  }
  if (!base) return undefined;
  base = base.replace(/\/+$/, "");
  if (path[0] !== "/") path = "/" + path;
  return {
    canonical: path === "/" ? base : base + path,
    types: {
      "application/rss+xml": `${base}/rss`,
      "application/atom+xml": `${base}/atom`,
      "application/feed+json": `${base}/json`,
    },
  };
}
