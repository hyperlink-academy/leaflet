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

// The tier ids the delimiter names, or null when it names none: every paid tier
// reads through.
export function getMembersDelimiterTierIds(
  blocks: { block?: { $type?: string; tiers?: unknown } }[] | undefined,
): string[] | null {
  const block = blocks?.find(
    (b) => b?.block?.$type === ids.PubLeafletBlocksMembersOnlyDelimiter,
  )?.block;
  if (!Array.isArray(block?.tiers)) return null;
  const tierIds = block.tiers.filter((t): t is string => typeof t === "string");
  return tierIds.length > 0 ? tierIds : null;
}

export function getGatedPostTierIds(
  doc: NormalizedDocument | null,
): string[] | null {
  const pages = doc ? getDocumentPages(doc) : undefined;
  const first = pages?.[0] as
    | { blocks?: { block?: { $type?: string; tiers?: unknown } }[] }
    | undefined;
  return getMembersDelimiterTierIds(first?.blocks);
}

// Resolves the ids a delimiter names against the publication's tier rows. null
// means unrestricted — every paid tier — which is also where a gate whose tiers
// have all been deleted lands: an unmatchable gate would otherwise lock out
// every member.
export function resolveUnlockingTierIds<T extends { id: string }>(
  namedTierIds: string[] | null,
  tiers: T[],
): string[] | null {
  if (!namedTierIds) return null;
  const live = tiers.filter((t) => namedTierIds.includes(t.id));
  return live.length > 0 ? live.map((t) => t.id) : null;
}

// Whether the gate names the free tier, which has no membership row behind it:
// subscribing to the publication is what reads past the delimiter. Callers pass
// the result to isEntitledToGatedPost as `subscriptionUnlocks`.
export function gateUnlocksWithSubscription<
  T extends { id: string; is_free: boolean },
>(unlockingTierIds: string[] | null | undefined, tiers: T[]): boolean {
  if (!unlockingTierIds) return false;
  return tiers.some((t) => t.is_free && unlockingTierIds.includes(t.id));
}

// Whether taking `tier` grants access past a delimiter unlocked by
// `unlockingTierIds` (resolve it with resolveUnlockingTierIds; null means every
// paid tier).
export function tierUnlocksGatedPost(
  tier: { id: string; is_free: boolean },
  unlockingTierIds: string[] | null | undefined,
): boolean {
  if (!unlockingTierIds) return !tier.is_free;
  return unlockingTierIds.includes(tier.id);
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

// The PDS copy of a publication post is public no matter what we do at serve
// time — getRecord, the firehose, and CAR exports all bypass leaflet.pub — so
// a gated post's record (and any pages blob offloaded from it) may only carry
// the preview above the members-only delimiter. The full record lives solely
// in our documents table, where per-viewer gating applies. Every path that
// writes a document record to a PDS must pass it through here first.
//
// Standalone documents (non at:// site) are returned unchanged: there's no
// membership to gate on, so their public page shows everything and the PDS
// copy should match. Non-mutating; the returned copy shares untouched page and
// block objects (including BlobRef instances) with the input.
export function truncateDocumentRecordForPDS<T extends { $type: string }>(
  record: T,
): T {
  const doc = record as T & {
    site?: string;
    publication?: string;
    pages?: unknown[];
    content?: { $type?: string; pages?: unknown[]; blobPages?: unknown };
  };
  const isPublicationDoc =
    doc.$type === "site.standard.document"
      ? !!doc.site?.startsWith("at://")
      : !!doc.publication;
  if (!isPublicationDoc) return record;

  const pages =
    doc.$type === "site.standard.document"
      ? doc.content?.blobPages
        ? undefined // already offloaded; nothing inline to truncate
        : doc.content?.pages
      : doc.pages;
  if (!Array.isArray(pages) || !pageHasMembersDelimiter(pages[0])) {
    return record;
  }

  const truncated = pages.map((p) => {
    const page = p as PageLike;
    return page && Array.isArray(page.blocks)
      ? { ...page, blocks: [...page.blocks] }
      : page;
  });
  truncatePagesAtMembersDelimiter(truncated);

  if (doc.$type === "site.standard.document") {
    return { ...doc, content: { ...doc.content, pages: truncated } } as T;
  }
  return { ...doc, pages: truncated } as T;
}

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

// Tiers a reader can actually join: active, and either free or provisioned in
// Stripe (a paid tier without a monthly price id is half-created and can't be
// subscribed to). Shared by the /join page and getJoinableTiers.
export function filterJoinableTiers<
  T extends {
    active: boolean;
    is_free: boolean;
    stripe_price_monthly_id: string | null;
    sort_order: number;
  },
>(tiers: T[]): T[] {
  return tiers
    .filter((t) => t.active && (t.is_free || t.stripe_price_monthly_id))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export type MembershipStatusFields = {
  status: string | null;
  current_period_end: string | null;
};

export function findActiveMembership<
  T extends { publication: string } & MembershipStatusFields,
>(
  memberships: T[] | null | undefined,
  publicationUri: string | undefined,
): T | null {
  if (!publicationUri) return null;
  return (
    (memberships ?? []).find(
      (m) => m.publication === publicationUri && isActiveMembership(m),
    ) ?? null
  );
}

export function memberTierUnlocksGatedPost(
  memberTier: string | null | undefined,
  unlockingTierIds: string[] | null | undefined,
): boolean {
  if (!unlockingTierIds) return true;
  return !!memberTier && unlockingTierIds.includes(memberTier);
}

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

// The full-access rule for a gated post, over already-fetched rows so the
// decision is testable without a database: the publication owner, a confirmed
// contributor, or an active member on an unlocking tier reads past the
// delimiter. `unlockingTierIds` (resolve it with resolveUnlockingTierIds) only
// matters when the delimiter names tiers; omitted or null, any active
// membership qualifies.
//
// `subscriptionUnlocks` (from gateUnlocksWithSubscription) is the free-tier
// gate: a subscriber reads through with no membership at all. Paying members
// clear it too — free is the lowest bar the author can set, so a member who
// never got a subscription row shouldn't be locked out of a post their free
// subscribers can read.
export function isEntitledToGatedPost(input: {
  viewerDid: string | null | undefined;
  ownerDid: string | null | undefined;
  contributors: { contributor_did: string; confirmed: boolean | null }[];
  membership:
    | (MembershipStatusFields & { tier?: string | null })
    | null
    | undefined;
  unlockingTierIds?: string[] | null;
  subscriptionUnlocks?: boolean;
  isSubscriber?: boolean;
}): boolean {
  const { viewerDid } = input;
  if (viewerDid) {
    if (input.ownerDid && input.ownerDid === viewerDid) return true;
    if (
      input.contributors.some(
        (c) => c.contributor_did === viewerDid && c.confirmed,
      )
    )
      return true;
  }
  if (input.subscriptionUnlocks && input.isSubscriber) return true;
  if (!isActiveMembership(input.membership)) return false;
  if (input.subscriptionUnlocks) return true;
  return memberTierUnlocksGatedPost(
    input.membership?.tier,
    input.unlockingTierIds,
  );
}
