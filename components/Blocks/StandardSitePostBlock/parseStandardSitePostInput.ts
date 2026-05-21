import { ids } from "lexicons/api/lexicons";

export function parseStandardSitePostInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // https://leaflet.pub/p/{did}/{rkey}
  let m = url.pathname.match(/^\/p\/([^/]+)\/([^/]+)\/?$/);
  if (m) return `at://${m[1]}/${ids.SiteStandardDocument}/${m[2]}`;

  // https://leaflet.pub/lish/{did}/{publication}/{rkey}
  m = url.pathname.match(/^\/lish\/([^/]+)\/[^/]+\/([^/]+)\/?$/);
  if (m) return `at://${m[1]}/${ids.SiteStandardDocument}/${m[2]}`;

  return null;
}
