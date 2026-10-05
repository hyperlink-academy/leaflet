import { strFromU8, unzipSync } from "fflate";
import { parseCsv } from "src/email-subscribers/import";

// Substack's export (Settings → Import/Export → Export your data) is a zip
// of:
//   posts.csv                  one row per post or draft, metadata only
//   posts/{id}.{slug}.html     that post's body as an HTML fragment
//   posts/{id}.{slug}.*.csv    per-post email delivery/open/click logs
//   email_list.{subdomain}.csv the subscriber list
// Only the first two are read here. The export has no images (bodies link to
// Substack's CDN), cover images, or tags; see substackSite.ts for those.

export type SubstackPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  publishedAt: string | null;
  isPublished: boolean;
  // "everyone" for a free post; anything else is some paid tier.
  audience: string;
  type: string;
  html: string;
  coverImage: string | null;
  tags: string[];
};

export type SubstackExport = {
  // From the subscriber list's file name; null if the export has no list.
  subdomain: string | null;
  posts: SubstackPost[];
  // Drafts with nothing in them, left out of `posts`.
  emptyDrafts: number;
};

const hasContent = (html: string) =>
  /<(img|iframe)\b|data-attrs=/.test(html) ||
  html.replace(/<[^>]*>/g, "").trim() !== "";

// Drafts that were never published have no title in posts.csv, only the slug
// Substack derived from one.
const titleFromSlug = (slug: string) => {
  const words = slug.replace(/-/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "(Untitled)";
};

export function parseSubstackExport(zip: Uint8Array): SubstackExport {
  let subdomain: string | null = null;
  const files = unzipSync(zip, {
    filter: (f) => {
      const name = f.name.split("/").pop()!;
      const list = /^email_list\.(.+)\.csv$/.exec(name);
      if (list) subdomain = list[1];
      return name === "posts.csv" || /(^|\/)posts\/[^/]+\.html$/.test(f.name);
    },
  });
  const csvPath = Object.keys(files).find((f) => /(^|\/)posts\.csv$/.test(f));
  if (!csvPath) throw new Error("Not a Substack export: no posts.csv");
  const root = csvPath.slice(0, -"posts.csv".length);

  const [header, ...rows] = parseCsv(
    strFromU8(files[csvPath]).replace(/^\uFEFF/, ""),
  );
  const column = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`posts.csv has no "${name}" column`);
    return i;
  };
  const cols = {
    id: column("post_id"),
    date: column("post_date"),
    published: column("is_published"),
    type: column("type"),
    audience: column("audience"),
    title: column("title"),
    subtitle: column("subtitle"),
  };

  const posts: SubstackPost[] = [];
  let emptyDrafts = 0;
  for (const row of rows) {
    // post_id is "{numeric id}.{slug}", which is also the body's file name.
    const postId = row[cols.id]?.trim();
    if (!postId) continue;
    const dot = postId.indexOf(".");
    if (dot < 0) throw new Error(`Unexpected post_id "${postId}"`);
    const slug = postId.slice(dot + 1);
    const body = files[`${root}posts/${postId}.html`];
    const html = body ? strFromU8(body) : "";
    const isPublished = row[cols.published] === "true";
    if (!hasContent(html)) {
      if (isPublished) throw new Error(`Published post ${postId} has no body`);
      emptyDrafts++;
      continue;
    }
    posts.push({
      id: postId.slice(0, dot),
      slug,
      title: row[cols.title]?.trim() || titleFromSlug(slug),
      subtitle: row[cols.subtitle]?.trim() ?? "",
      publishedAt: row[cols.date] || null,
      isPublished,
      audience: row[cols.audience] || "everyone",
      type: row[cols.type] || "newsletter",
      html,
      coverImage: null,
      tags: [],
    });
  }
  // Oldest first, so an import that publishes in list order produces a
  // sensibly-ordered feed; undated drafts go last.
  posts.sort((a, b) =>
    (a.publishedAt ?? "9").localeCompare(b.publishedAt ?? "9"),
  );
  return { subdomain, posts, emptyDrafts };
}
