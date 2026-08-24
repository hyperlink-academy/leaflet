// Ghost's admin export (Settings → Labs → Export) is a JSON dump of its
// database tables. This picks out the posts and just enough of the site
// metadata to plan an import; everything else (members, settings, roles…) is
// ignored.

export type GhostPostType = "post" | "page";
export type GhostPostStatus = "published" | "draft" | "scheduled" | "sent";
export type GhostVisibility = "public" | "members" | "paid" | "tiers";

export type GhostPost = {
  id: string;
  slug: string;
  title: string;
  type: GhostPostType;
  status: GhostPostStatus;
  visibility: GhostVisibility;
  html: string;
  plaintext: string;
  featureImage: string | null;
  featureImageAlt: string | null;
  featureImageCaption: string | null;
  customExcerpt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  tags: string[];
  authors: string[];
};

export type GhostSite = {
  title: string | null;
  description: string | null;
};

export type GhostExport = {
  site: GhostSite;
  posts: GhostPost[];
  // Table row counts, for the admin to sanity-check the file against the
  // Ghost admin's numbers.
  counts: { posts: number; pages: number; tags: number; users: number };
};

// Ghost writes its own origin as this placeholder so an export can be restored
// under a different URL.
export const GHOST_URL_PLACEHOLDER = "__GHOST_URL__";

export function resolveGhostUrl(
  value: string | null | undefined,
  siteUrl: string,
): string | null {
  if (!value) return null;
  const base = siteUrl.replace(/\/+$/, "");
  return value.split(GHOST_URL_PLACEHOLDER).join(base);
}

type Row = Record<string, unknown>;

function rows(data: Record<string, unknown>, table: string): Row[] {
  const v = data[table];
  return Array.isArray(v) ? (v as Row[]) : [];
}
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

export function parseGhostExport(
  json: unknown,
): { ok: true; value: GhostExport } | { ok: false; error: string } {
  if (!json || typeof json !== "object")
    return { ok: false, error: "Not a JSON object" };
  // Both shapes exist in the wild: the full export `{db:[{meta,data}]}` and a
  // bare `{meta,data}` (or `{data}`) from older tools.
  let data: Record<string, unknown> | undefined;
  const root = json as Record<string, unknown>;
  if (Array.isArray(root.db)) {
    const first = root.db[0] as Record<string, unknown> | undefined;
    data = first?.data as Record<string, unknown> | undefined;
  } else if (root.data && typeof root.data === "object") {
    data = root.data as Record<string, unknown>;
  } else if (Array.isArray(root.posts)) {
    data = root;
  }
  if (!data || !Array.isArray(data.posts))
    return {
      ok: false,
      error: "No posts table found — is this a Ghost export file?",
    };

  const tagsById = new Map<string, { name: string; visibility: string }>();
  for (const t of rows(data, "tags")) {
    const id = str(t.id);
    const name = str(t.name);
    if (id && name)
      tagsById.set(id, {
        name,
        visibility: str(t.visibility) ?? "public",
      });
  }
  const postTags = new Map<string, Array<{ tag: string; sort: number }>>();
  for (const pt of rows(data, "posts_tags")) {
    const postId = str(pt.post_id);
    const tagId = str(pt.tag_id);
    const tag = tagId && tagsById.get(tagId);
    // Internal tags (#name) are Ghost-side routing/theme hooks, not labels.
    if (!postId || !tag || tag.visibility !== "public") continue;
    if (tag.name.startsWith("#")) continue;
    let list = postTags.get(postId);
    if (!list) postTags.set(postId, (list = []));
    list.push({ tag: tag.name, sort: Number(pt.sort_order ?? 0) });
  }

  const usersById = new Map<string, string>();
  for (const u of rows(data, "users")) {
    const id = str(u.id);
    const name = str(u.name);
    if (id && name) usersById.set(id, name);
  }
  const postAuthors = new Map<string, Array<{ name: string; sort: number }>>();
  for (const pa of rows(data, "posts_authors")) {
    const postId = str(pa.post_id);
    const authorId = str(pa.author_id);
    const name = authorId && usersById.get(authorId);
    if (!postId || !name) continue;
    let list = postAuthors.get(postId);
    if (!list) postAuthors.set(postId, (list = []));
    list.push({ name, sort: Number(pa.sort_order ?? 0) });
  }

  const metaByPost = new Map<string, Row>();
  for (const m of rows(data, "posts_meta")) {
    const postId = str(m.post_id);
    if (postId) metaByPost.set(postId, m);
  }

  const posts: GhostPost[] = [];
  for (const p of rows(data, "posts")) {
    const id = str(p.id);
    if (!id) continue;
    const type = p.type === "page" ? "page" : "post";
    const statusRaw = str(p.status);
    const status: GhostPostStatus =
      statusRaw === "published" ||
      statusRaw === "draft" ||
      statusRaw === "scheduled" ||
      statusRaw === "sent"
        ? statusRaw
        : "draft";
    const visRaw = str(p.visibility);
    const visibility: GhostVisibility =
      visRaw === "members" || visRaw === "paid" || visRaw === "tiers"
        ? visRaw
        : "public";
    const meta = metaByPost.get(id);
    posts.push({
      id,
      slug: str(p.slug) ?? id,
      title: str(p.title) ?? "(Untitled)",
      type,
      status,
      visibility,
      html: str(p.html) ?? "",
      plaintext: str(p.plaintext) ?? "",
      featureImage: str(p.feature_image),
      featureImageAlt: str(meta?.feature_image_alt),
      featureImageCaption: str(meta?.feature_image_caption),
      customExcerpt: str(p.custom_excerpt),
      publishedAt: str(p.published_at),
      createdAt: str(p.created_at) ?? new Date(0).toISOString(),
      updatedAt: str(p.updated_at),
      tags: (postTags.get(id) ?? [])
        .sort((a, b) => a.sort - b.sort)
        .map((t) => t.tag),
      authors: (postAuthors.get(id) ?? [])
        .sort((a, b) => a.sort - b.sort)
        .map((a) => a.name),
    });
  }
  // Oldest first, so an import that publishes in file order produces a
  // sensibly-ordered feed even when publishedAt is not honoured.
  posts.sort((a, b) => {
    const ad = a.publishedAt ?? a.createdAt;
    const bd = b.publishedAt ?? b.createdAt;
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });

  const settings = new Map<string, string | null>();
  for (const s of rows(data, "settings")) {
    const key = str(s.key);
    if (key) settings.set(key, str(s.value));
  }

  return {
    ok: true,
    value: {
      site: {
        title: settings.get("title") ?? null,
        description: settings.get("description") ?? null,
      },
      posts,
      counts: {
        posts: posts.filter((p) => p.type === "post").length,
        pages: posts.filter((p) => p.type === "page").length,
        tags: tagsById.size,
        users: usersById.size,
      },
    },
  };
}

// Ghost derives a post's excerpt from the first ~500 characters of plaintext
// when no custom excerpt is set. Leaflet shows the description as a subtitle
// and meta description, so keep it to a sentence or two.
export function ghostExcerpt(post: GhostPost, maxLength = 280): string {
  if (post.customExcerpt) return post.customExcerpt.trim();
  const firstParagraph = post.plaintext
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  if (!firstParagraph) return "";
  if (firstParagraph.length <= maxLength) return firstParagraph;
  const cut = firstParagraph.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut) + "…";
}
