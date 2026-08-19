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

export type GatePolicy =
  | { audience: "subscribers" }
  | { audience: "paid" }
  | { audience: "tiers"; tierIds: string[] };

type MembersDelimiterBlock = {
  $type?: string;
  audience?: unknown;
  tierIds?: unknown;
  // Pre-audience lexicon shape: absent tiers meant every paid tier, a
  // non-empty list restricted to those tiers.
  tiers?: unknown;
};

// Parse the policy stored on a delimiter. Invalid policies remain invalid so a
// malformed or empty tier selection can never accidentally broaden access.
export function getMembersDelimiterGatePolicy(
  blocks: { block?: MembersDelimiterBlock }[] | undefined,
): GatePolicy | null {
  const block = blocks?.find(
    (b) => b?.block?.$type === ids.PubLeafletBlocksMembersOnlyDelimiter,
  )?.block;
  if (!block) return null;
  if (block.audience === "subscribers") return { audience: "subscribers" };
  if (block.audience === "paid") return { audience: "paid" };
  if (block.audience === "tiers") {
    if (!Array.isArray(block.tierIds)) return null;
    return {
      audience: "tiers",
      tierIds: [
        ...new Set(
          block.tierIds.filter((id): id is string => typeof id === "string"),
        ),
      ],
    };
  }
  if (block.audience !== undefined) return null;
  if (block.tiers === undefined) return { audience: "paid" };
  if (!Array.isArray(block.tiers)) return null;
  const tierIds = [
    ...new Set(
      block.tiers.filter((id): id is string => typeof id === "string"),
    ),
  ];
  return tierIds.length > 0
    ? { audience: "tiers", tierIds }
    : { audience: "paid" };
}

export function getGatedPostPolicy(
  doc: NormalizedDocument | null,
): GatePolicy | null {
  const pages = doc ? getDocumentPages(doc) : undefined;
  const first = pages?.[0] as
    | { blocks?: { block?: MembersDelimiterBlock }[] }
    | undefined;
  return getMembersDelimiterGatePolicy(first?.blocks);
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

export type MembershipStatusFields = {
  status: string | null;
  current_period_end: string | null;
};

export type SubscriberTier = {
  name: string;
  description: string | null;
};

export type PaidTier = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
};

export type MembershipTiers = {
  subscriber: SubscriberTier;
  paid: PaidTier[];
};

// The subscriber plan is publication metadata rather than a billing row. Build
// the public tiers here so every join, paywall, and dashboard surface sees
// the same synthesized plan and the same active paid tiers.
export function buildMembershipTiers<
  T extends PaidTier & { active: boolean; sort_order: number },
>(
  settings:
    | {
        subscriber_tier_name: string;
        subscriber_tier_description: string | null;
      }
    | null
    | undefined,
  tiers: T[],
): MembershipTiers {
  return {
    subscriber: {
      name: settings?.subscriber_tier_name ?? "Free",
      description: settings?.subscriber_tier_description ?? null,
    },
    paid: tiers
      .filter((tier) => tier.active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        monthly_price_cents: tier.monthly_price_cents,
        annual_price_cents: tier.annual_price_cents,
      })),
  };
}

export type ResolvedPublicationMembership =
  | { kind: "free" }
  | { kind: "paid"; tierId: string };

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

export function resolvePublicationMembership(input: {
  isSubscriber: boolean;
  paidMembership:
    | (MembershipStatusFields & { tier: string })
    | null
    | undefined;
}): ResolvedPublicationMembership | null {
  const paidMembership = input.paidMembership;
  if (paidMembership && isActiveMembership(paidMembership)) {
    return {
      kind: "paid",
      tierId: paidMembership.tier,
    };
  }

  return input.isSubscriber ? { kind: "free" } : null;
}

export function membershipUnlocksGatedPost(
  membership: ResolvedPublicationMembership | null | undefined,
  policy: GatePolicy | null | undefined,
): boolean {
  if (!membership || !policy) return false;
  if (policy.audience === "subscribers") return true;
  if (membership.kind !== "paid") return false;
  if (policy.audience === "paid") return true;
  return (
    policy.tierIds.length > 0 && policy.tierIds.includes(membership.tierId)
  );
}

// The full-access rule for a gated post, over already-fetched rows so the
// decision is testable without a database: the publication owner, a confirmed
// contributor, or a resolved membership admitted by the gate reads past the
// delimiter. Membership resolution and the gate decision intentionally happen
// together so callers cannot apply only half of the access rule.
export function isEntitledToGatedPost(input: {
  viewerDid: string | null | undefined;
  ownerDid: string | null | undefined;
  contributors: { contributor_did: string; confirmed: boolean | null }[];
  paidMembership:
    | (MembershipStatusFields & { tier: string })
    | null
    | undefined;
  gatePolicy: GatePolicy | null | undefined;
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
  return membershipUnlocksGatedPost(
    resolvePublicationMembership({
      isSubscriber: !!input.isSubscriber,
      paidMembership: input.paidMembership,
    }),
    input.gatePolicy,
  );
}
