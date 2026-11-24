import { getDomain } from "tldts";
import type { ReviewDocument, ReviewLink } from "./types";

const TEXT_KEPT = 12000;

// Link targets that say nothing about who is behind an account: platforms
// everyone links to, and Leaflet itself.
const IGNORED_DOMAINS = new Set([
  "leaflet.pub",
  "bsky.app",
  "bsky.social",
  "atproto.com",
  "wikipedia.org",
  "wikimedia.org",
  "youtube.com",
  "youtu.be",
  "github.com",
  "google.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "facebook.com",
  "linkedin.com",
  "reddit.com",
  "substack.com",
  "medium.com",
  "archive.org",
  "spotify.com",
  "apple.com",
  "amazon.com",
  "nytimes.com",
  "theguardian.com",
  "bbc.com",
  "bbc.co.uk",
  "arxiv.org",
  "doi.org",
  "tenor.com",
  "giphy.com",
  "vimeo.com",
  "soundcloud.com",
  "bandcamp.com",
  "patreon.com",
  "ko-fi.com",
  "gumroad.com",
  "linktr.ee",
  "tinyurl.com",
  "bit.ly",
  "goo.gl",
  "forms.gle",
  "discord.gg",
  "discord.com",
  "mastodon.social",
  "microsoft.com",
  "cloudflare.com",
  "unsplash.com",
  "example.com",
  "goodreads.com",
  "letterboxd.com",
  "boxd.it",
  "archiveofourown.org",
  "tangled.org",
  "standard.site",
]);

// Walks a document record of either lexicon family for its prose and the
// URLs it points at (link facets, embeds, buttons).
function walk(
  node: unknown,
  key: string | null,
  out: { text: string[]; urls: Set<string> },
) {
  if (typeof node === "string") {
    if (key === "plaintext") out.text.push(node);
    else if (/^https?:\/\//i.test(node)) out.urls.add(node.trim());
  } else if (Array.isArray(node)) {
    for (let child of node) walk(child, key, out);
  } else if (node && typeof node === "object") {
    for (let [k, v] of Object.entries(node)) walk(v, k, out);
  }
}

export function extractLinks(urls: Iterable<string>): ReviewLink[] {
  let links: ReviewLink[] = [];
  for (let url of urls) {
    // Private suffixes on, so a site on shared hosting (name.github.io) is
    // its own domain and not the host's.
    let domain = getDomain(url, { allowPrivateDomains: true })?.toLowerCase();
    if (!domain || IGNORED_DOMAINS.has(domain)) continue;
    links.push({ url: url.slice(0, 500), domain });
  }
  return links;
}

export function toReviewDocument(row: {
  uri: string;
  publication: string | null;
  data: unknown;
  sort_date: string | Date | null;
}): ReviewDocument {
  let record = (row.data ?? {}) as Record<string, unknown>;
  let out = { text: [] as string[], urls: new Set<string>() };
  // `site` is the document's own home, not something it links to.
  let { site, ...rest } = record;
  walk(rest, null, out);
  let text =
    typeof record.textContent === "string" && record.textContent
      ? record.textContent
      : out.text.join("\n");
  let published =
    typeof record.publishedAt === "string" ? record.publishedAt : row.sort_date;
  return {
    uri: row.uri,
    publication: row.publication,
    title: typeof record.title === "string" ? record.title : null,
    description:
      typeof record.description === "string" ? record.description : null,
    text: text.slice(0, TEXT_KEPT),
    chars: text.length,
    links: extractLinks(out.urls),
    publishedAt: published ? new Date(published).toISOString() : null,
  };
}

export function distinctDomains(doc: ReviewDocument): string[] {
  return [...new Set(doc.links.map((l) => l.domain))];
}
