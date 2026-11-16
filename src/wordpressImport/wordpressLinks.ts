import type { WordpressPost } from "./parseWordpressExport";

// WordPress resolves a post at its permalink and at ?p=id, with or without
// www and a trailing slash.
function linkKey(href: string): string | null {
  try {
    const url = new URL(href);
    const p = url.searchParams.get("p") ?? url.searchParams.get("page_id");
    const host = url.host.replace(/^www\./, "");
    return p
      ? `${host}?p=${p}`
      : `${host}${decodeURI(url.pathname).replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

// The keys a post's own links are recognised by, mapped to its slug.
export function wordpressPermalinks(
  posts: Array<Pick<WordpressPost, "slug" | "link" | "guid">>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const post of posts)
    for (const href of [post.link, post.guid]) {
      const key = linkKey(href);
      if (key) map[key] = post.slug;
    }
  return map;
}

// Rewrites the author's links to their own WordPress posts and pages so
// they point at the imported copies, which keep their slugs.
export function wordpressLinkRewriter(
  permalinks: Record<string, string>,
  publicationUrl: string,
) {
  const base = publicationUrl.replace(/\/+$/, "");
  return (href: string) => {
    const key = linkKey(href);
    const slug = key ? permalinks[key] : undefined;
    if (!slug) return href;
    const hash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
    return `${base}/${slug}${hash}`;
  };
}
