import type { Metadata } from "next";
import type { NormalizedPublication } from "src/utils/normalizeRecords";

// Canonical + feed discovery links for a public publication page. Set from
// each public page's generateMetadata rather than the publication layout so
// utility routes (/dashboard, /edit, /subscribe, ...) don't inherit a
// canonical claiming they're publication content.
export function publicationAlternates(
  pubRecord: NormalizedPublication | null | undefined,
  path: string,
): Metadata["alternates"] {
  if (!pubRecord?.url) return undefined;
  let base = pubRecord.url.replace(/\/+$/, "");
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
