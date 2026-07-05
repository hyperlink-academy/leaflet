import { ids } from "lexicons/api/lexicons";
import {
  getDocumentPages,
  type NormalizedDocument,
} from "lexicons/src/normalize";

// Pure helpers shared by client and server. The server-side membership lookup
// lives with its consumers (e.g. getPostPageData) — importing the supabase
// service client here would break client bundles.

export function pageHasMembersDelimiter(page: unknown): boolean {
  const blocks = (page as { blocks?: unknown[] } | null)?.blocks;
  if (!Array.isArray(blocks)) return false;
  return blocks.some(
    (b) =>
      (b as { block?: { $type?: string } } | null)?.block?.$type ===
      ids.PubLeafletBlocksMembersOnlyDelimiter,
  );
}

// Gating only applies to the post's first page; delimiters can't be inserted
// elsewhere.
export function postHasMembersDelimiter(
  doc: NormalizedDocument | null,
): boolean {
  const pages = doc ? getDocumentPages(doc) : undefined;
  return !!pages?.[0] && pageHasMembersDelimiter(pages[0]);
}

// For render paths that work on a flat block list (RSS feed, newsletter
// email) and can't know who's reading: drop the delimiter and everything
// after it.
export function truncateBlocksAtMembersDelimiter<
  T extends { block?: { $type?: string } },
>(blocks: T[]): T[] {
  const idx = blocks.findIndex(
    (b) => b?.block?.$type === ids.PubLeafletBlocksMembersOnlyDelimiter,
  );
  return idx === -1 ? blocks : blocks.slice(0, idx);
}

type PageLike = {
  id?: string;
  blocks?: { block?: { $type?: string; id?: unknown } }[];
};

// Truncates the first page at the delimiter (keeping the delimiter itself as
// the paywall anchor) and drops subpages no longer reachable from it. Mutates
// in place: the raw record JSON and the normalized view share these arrays, so
// one pass gates both and no post-delimiter block reaches the client.
export function truncatePagesAtMembersDelimiter(pages: unknown[]): void {
  const first = pages[0] as PageLike | undefined;
  if (!first?.blocks) return;
  const idx = first.blocks.findIndex(
    (b) => b?.block?.$type === ids.PubLeafletBlocksMembersOnlyDelimiter,
  );
  if (idx === -1) return;
  first.blocks.splice(idx + 1);

  const reachable = new Set<string>();
  const collect = (page: PageLike) => {
    for (const b of page.blocks ?? []) {
      const block = b?.block;
      if (
        block?.$type === "pub.leaflet.blocks.page" &&
        typeof block.id === "string" &&
        !reachable.has(block.id)
      ) {
        reachable.add(block.id);
        const sub = pages.find((p) => (p as PageLike)?.id === block.id);
        if (sub) collect(sub as PageLike);
      }
    }
  };
  collect(first);
  for (let i = pages.length - 1; i >= 1; i--) {
    const id = (pages[i] as PageLike)?.id;
    if (!id || !reachable.has(id)) pages.splice(i, 1);
  }
}

export type MembershipStatusFields = {
  status: string | null;
  current_period_end: string | null;
};

export function isActiveMembership(
  m: MembershipStatusFields | null | undefined,
): boolean {
  if (!m) return false;
  if (m.status !== "active" && m.status !== "trialing") return false;
  if (
    m.current_period_end &&
    new Date(m.current_period_end).getTime() < Date.now()
  )
    return false;
  return true;
}

// Client-side check over the memberships embedded in identity data.
export function getActiveMembership<
  M extends MembershipStatusFields & { publication: string },
>(
  identity: { publication_memberships?: M[] | null } | null | undefined,
  publicationUri: string,
): M | null {
  const m = identity?.publication_memberships?.find(
    (m) => m.publication === publicationUri,
  );
  return m && isActiveMembership(m) ? m : null;
}
