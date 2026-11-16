// WordPress's export (Tools → Export, or WordPress.com's Settings → Export)
// is a WXR file: an RSS feed with WordPress's own namespaced elements. Each
// <item> is a post, page, attachment, nav menu item, and so on, told apart by
// <wp:post_type>. Media files aren't in the export; attachments only point at
// them on the live site.
//
// This runs in the browser, so it parses with the DOM's own XML parser.

export type WordpressAttachment = {
  url: string;
  width: number | null;
  height: number | null;
};

export type WordpressPost = {
  id: string;
  slug: string;
  title: string;
  type: "post" | "page";
  // publish, draft, pending, private or future (scheduled).
  status: string;
  passwordProtected: boolean;
  // The permalink, and the ?p=id form WordPress also resolves.
  link: string;
  guid: string;
  html: string;
  excerpt: string;
  // When it was published, or for an unpublished post when it was last
  // dated.
  date: string;
  tags: string[];
  featureImage: WordpressAttachment | null;
  // The attachments the body refers to by id (wp-image-N classes and gallery
  // shortcodes), whose stored files are the originals of what the body
  // shows resized.
  attachments: Record<string, WordpressAttachment>;
};

export type WordpressExport = {
  siteTitle: string;
  siteUrl: string;
  posts: WordpressPost[];
};

// Not content: trashed posts, and autosaves WordPress never showed anyone.
const SKIPPED_STATUSES = new Set(["trash", "auto-draft", "inherit"]);

const children = (el: Element, name: string) =>
  Array.from(el.children).filter((c) => c.tagName === name);
const text = (el: Element, name: string) =>
  children(el, name)[0]?.textContent ?? "";

// WXR dates are "YYYY-MM-DD HH:MM:SS"; drafts that were never published have
// an all-zero GMT date.
function isoDate(value: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(value.trim());
  if (!m || m[1] === "0000-00-00") return null;
  return `${m[1]}T${m[2]}.000Z`;
}

function meta(item: Element): Map<string, string> {
  return new Map(
    children(item, "wp:postmeta").map((m) => [
      text(m, "wp:meta_key"),
      text(m, "wp:meta_value"),
    ]),
  );
}

// _wp_attachment_metadata is a PHP-serialized array whose first width and
// height are the original's; the per-size renditions come after.
function attachmentSize(serialized: string | undefined) {
  const m = serialized
    ? /s:5:"width";i:(\d+);s:6:"height";i:(\d+);/.exec(serialized)
    : null;
  return {
    width: m ? Number(m[1]) || null : null,
    height: m ? Number(m[2]) || null : null,
  };
}

// The ids of attachments a post body refers to.
function referencedAttachments(html: string): string[] {
  const ids = Array.from(html.matchAll(/\bwp-image-(\d+)\b/g), (m) => m[1]);
  for (const g of html.matchAll(/\[gallery\b[^\]]*\bids=["']([\d,\s]+)["']/g))
    ids.push(...g[1].split(",").map((s) => s.trim()));
  return ids.filter(Boolean);
}

export function parseWordpressExport(xml: string): WordpressExport {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length)
    throw new Error("Not a WordPress export: the file isn't valid XML");
  const channel = doc.querySelector("rss > channel");
  if (!channel || !children(channel, "wp:wxr_version").length)
    throw new Error("Not a WordPress export: expected a WXR <rss> feed");

  const items = children(channel, "item");
  const attachments = new Map<string, WordpressAttachment>();
  for (const item of items) {
    if (text(item, "wp:post_type") !== "attachment") continue;
    const url = text(item, "wp:attachment_url");
    if (!url) continue;
    attachments.set(text(item, "wp:post_id"), {
      url,
      ...attachmentSize(meta(item).get("_wp_attachment_metadata")),
    });
  }

  const posts: WordpressPost[] = [];
  for (const item of items) {
    const type = text(item, "wp:post_type");
    if (type !== "post" && type !== "page") continue;
    const status = text(item, "wp:status");
    if (SKIPPED_STATUSES.has(status)) continue;

    const id = text(item, "wp:post_id");
    const html = text(item, "content:encoded");
    const tags: string[] = [];
    const seen = new Set<string>();
    // Categories first: they're the coarser, site-wide grouping.
    for (const domain of ["category", "post_tag"])
      for (const c of children(item, "category")) {
        if (c.getAttribute("domain") !== domain) continue;
        const name = c.textContent?.trim() ?? "";
        if (!name || c.getAttribute("nicename") === "uncategorized") continue;
        if (seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        tags.push(name);
      }

    const thumbnail = meta(item).get("_thumbnail_id");
    const date =
      isoDate(text(item, "wp:post_date_gmt")) ??
      isoDate(text(item, "wp:post_date")) ??
      new Date().toISOString();
    posts.push({
      id,
      // Unpublished posts may not have a slug yet.
      slug: text(item, "wp:post_name") || id,
      title: text(item, "title").trim() || "(Untitled)",
      type,
      status,
      passwordProtected: text(item, "wp:post_password") !== "",
      link: text(item, "link"),
      guid: text(item, "guid"),
      html,
      excerpt: text(item, "excerpt:encoded").trim(),
      date,
      tags,
      featureImage: (thumbnail && attachments.get(thumbnail)) || null,
      attachments: Object.fromEntries(
        referencedAttachments(html).flatMap((a) => {
          const found = attachments.get(a);
          return found ? [[a, found]] : [];
        }),
      ),
    });
  }

  // Oldest first, so an import that publishes in file order produces a
  // sensibly-ordered feed.
  posts.sort((a, b) => a.date.localeCompare(b.date));
  return {
    siteTitle: text(channel, "title"),
    siteUrl:
      text(channel, "wp:base_blog_url") ||
      text(channel, "link") ||
      text(channel, "wp:base_site_url"),
    posts,
  };
}
