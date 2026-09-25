// Ghost's admin export (Settings → Labs → Export) is a JSON dump of its
// database tables. This picks out the posts and their public tags; everything
// else (members, settings, users…) is ignored.

export type GhostPost = {
  id: string;
  slug: string;
  title: string;
  type: "post" | "page";
  status: string;
  visibility: string;
  html: string;
  plaintext: string;
  featureImage: string | null;
  customExcerpt: string | null;
  publishedAt: string | null;
  createdAt: string;
  tags: string[];
};

// Ghost writes its own origin as this placeholder so an export can be restored
// under a different URL.
export const GHOST_URL_PLACEHOLDER = "__GHOST_URL__";

export function resolveGhostUrl(value: string, siteUrl: string): string {
  return value.split(GHOST_URL_PLACEHOLDER).join(siteUrl.replace(/\/+$/, ""));
}

type Row = Record<string, unknown>;

function table(data: Row, name: string): Row[] {
  const rows = data[name];
  if (!Array.isArray(rows)) throw new Error(`Export has no "${name}" table`);
  return rows as Row[];
}
const str = (row: Row, key: string): string | null => {
  const v = row[key];
  return typeof v === "string" && v ? v : null;
};
function required(row: Row, key: string): string {
  const v = str(row, key);
  if (v === null) throw new Error(`Row ${row.id} has no "${key}"`);
  return v;
}

export function parseGhostExport(json: unknown): GhostPost[] {
  const data = (json as { db?: Array<{ data?: Row }> })?.db?.[0]?.data;
  if (!data) throw new Error("Not a Ghost export: expected {db: [{data}]}");

  // Internal tags (#name) are Ghost-side routing/theme hooks, not labels.
  const tagNames = new Map(
    table(data, "tags")
      .filter(
        (t) =>
          t.visibility === "public" && !required(t, "name").startsWith("#"),
      )
      .map((t) => [required(t, "id"), required(t, "name")]),
  );
  const postTags = new Map<string, Array<{ name: string; sort: number }>>();
  for (const pt of table(data, "posts_tags")) {
    const name = tagNames.get(required(pt, "tag_id"));
    if (!name) continue;
    const postId = required(pt, "post_id");
    postTags.set(postId, [
      ...(postTags.get(postId) ?? []),
      { name, sort: Number(pt.sort_order ?? 0) },
    ]);
  }

  const posts = table(data, "posts").map(
    (p): GhostPost => ({
      id: required(p, "id"),
      slug: required(p, "slug"),
      title: str(p, "title") ?? "(Untitled)",
      type: p.type === "page" ? "page" : "post",
      status: required(p, "status"),
      visibility: required(p, "visibility"),
      html: str(p, "html") ?? "",
      plaintext: str(p, "plaintext") ?? "",
      featureImage: str(p, "feature_image"),
      customExcerpt: str(p, "custom_excerpt"),
      publishedAt: str(p, "published_at"),
      createdAt: required(p, "created_at"),
      tags: (postTags.get(required(p, "id")) ?? [])
        .sort((a, b) => a.sort - b.sort)
        .map((t) => t.name),
    }),
  );
  // Oldest first, so an import that publishes in file order produces a
  // sensibly-ordered feed.
  return posts.sort((a, b) =>
    (a.publishedAt ?? a.createdAt).localeCompare(b.publishedAt ?? b.createdAt),
  );
}

// Ghost derives a post's excerpt from the first ~500 characters of plaintext
// when no custom excerpt is set. Leaflet shows the description as a subtitle
// and meta description, so keep it to a sentence or two.
export function ghostExcerpt(post: GhostPost, maxLength = 280): string {
  if (post.customExcerpt) return post.customExcerpt.trim();
  const first =
    post.plaintext
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .find(Boolean) ?? "";
  if (first.length <= maxLength) return first;
  return first.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
