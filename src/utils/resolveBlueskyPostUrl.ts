import { AtUri } from "@atproto/syntax";

const POST_COLLECTION = "app.bsky.feed.post";

/**
 * Resolve an arbitrary web URL to a Bluesky post AT URI by reading the page's
 * link metadata. The bsky.app post template (and its forks) advertise the post
 * in the document head, either as a raw alternate link to the at:// URI or via
 * the oembed discovery link whose `url` param is that same URI. Detecting the
 * tag lets us embed posts from any AT Proto client, not just a hardcoded host
 * list. Returns null for anything that isn't an app.bsky.feed.post.
 */
export async function resolveBlueskyPostUrl(
  input: string,
): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  let html: string;
  try {
    let res = await fetch(input, {
      headers: { Accept: "text/html" },
      next: { revalidate: 60 * 10 },
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").includes("text/html"))
      return null;
    html = await res.text();
  } catch {
    return null;
  }

  let uri = extractAtUriFromHead(html);
  if (!uri) return null;

  try {
    let parsed = new AtUri(uri);
    if (parsed.collection !== POST_COLLECTION) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractAtUriFromHead(html: string): string | null {
  let headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  let scope = headMatch ? headMatch[1] : html;
  let linkTags = scope.match(/<link\b[^>]*>/gi) || [];

  // Preferred: a direct alternate link to the post's at:// URI.
  for (let tag of linkTags) {
    let rel = getAttr(tag, "rel");
    if (!rel || !/\balternate\b/i.test(rel)) continue;
    let href = getAttr(tag, "href");
    if (href?.startsWith("at://")) return href;
  }

  // Fallback: the oembed discovery link carries the URI in its `url` param.
  for (let tag of linkTags) {
    let type = getAttr(tag, "type");
    if (!type || !/json\+oembed/i.test(type)) continue;
    let href = getAttr(tag, "href");
    if (!href) continue;
    try {
      let oembedUrl = new URL(href.replace(/&amp;/g, "&"));
      let target = oembedUrl.searchParams.get("url");
      if (target?.startsWith("at://")) return target;
    } catch {}
  }

  return null;
}

function getAttr(tag: string, attr: string): string | null {
  let m =
    tag.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i")) ||
    tag.match(new RegExp(`${attr}\\s*=\\s*'([^']*)'`, "i"));
  return m ? m[1] : null;
}
