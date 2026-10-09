import type { SubstackPost } from "./parseSubstackExport";

// What a Substack export leaves out but the publication's own site still
// serves: each published post's cover image and tags, and the excerpt shown
// for posts without a subtitle.
export type SubstackPostMetadata = {
  coverImage: string | null;
  tags: string[];
  description: string;
};

type ArchivePost = {
  id: number;
  cover_image?: string | null;
  description?: string | null;
  postTags?: Array<{ name: string; hidden?: boolean }> | null;
};

// The archive endpoint caps its page size below what's asked for, so pages
// are walked until one comes back empty.
const MAX_PAGES = 500;

// Read the public archive of a Substack site, keyed by post id. Drafts and
// unpublished posts aren't in it.
export async function fetchSubstackMetadata(
  siteUrl: string,
): Promise<Record<string, SubstackPostMetadata>> {
  const origin = new URL(siteUrl).origin;
  const metadata: Record<string, SubstackPostMetadata> = {};
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${origin}/api/v1/archive?sort=new&limit=50&offset=${offset}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Fetching ${url} failed: HTTP ${res.status}`);
    const posts = (await res.json()) as ArchivePost[];
    if (!Array.isArray(posts))
      throw new Error(`${url} did not return a list of posts`);
    if (posts.length === 0) break;
    for (const p of posts)
      metadata[String(p.id)] = {
        coverImage: p.cover_image || null,
        tags: (p.postTags ?? []).filter((t) => !t.hidden).map((t) => t.name),
        description: p.description?.trim() ?? "",
      };
    offset += posts.length;
  }
  return metadata;
}

export function applySubstackMetadata(
  posts: SubstackPost[],
  metadata: Record<string, SubstackPostMetadata>,
): SubstackPost[] {
  return posts.map((p) => {
    const m = metadata[p.id];
    if (!m) return p;
    return {
      ...p,
      coverImage: m.coverImage,
      tags: m.tags,
      subtitle: p.subtitle || m.description,
    };
  });
}
