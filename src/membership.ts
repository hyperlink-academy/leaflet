import { ids } from "lexicons/api/lexicons";
import type * as AudienceLex from "lexicons/api/types/pub/leaflet/audience";
import {
  getDocumentPages,
  type NormalizedDocument,
} from "lexicons/src/normalize";

// Pure helpers shared by client and server. The server-side membership lookup
// lives with its consumers (e.g. getPostPageData) — importing the supabase
// service client here would break client bundles.

// Every gating check goes through this rather than matching $type, so a
// delimiter whose wider release is public stops gating everywhere at
// once — the post reads as ungated even though the block is still in it.
export function isActiveMembersDelimiter(
  block: unknown,
  now: number = Date.now(),
): boolean {
  const b = block as MembersDelimiterBlock | null | undefined;
  if (b?.$type !== ids.PubLeafletBlocksMembersOnlyDelimiter) return false;
  return !(
    getWiderReleasePolicy(b)?.audience === "public" &&
    widerReleaseReached(b, now)
  );
}

// Whether the page has a delimiter at all, released or not. For deciding
// whether a record is one of ours whose full copy we keep, which stays true
// after a public wider release.
export function pageContainsMembersDelimiter(page: unknown): boolean {
  return !!findDelimiterBlock(
    (page as { blocks?: unknown } | null | undefined)?.blocks,
  );
}

export function pageHasMembersDelimiter(
  page: unknown,
  now: number = Date.now(),
): boolean {
  const blocks = (page as { blocks?: unknown[] } | null)?.blocks;
  if (!Array.isArray(blocks)) return false;
  return blocks.some((b) =>
    isActiveMembersDelimiter((b as { block?: unknown } | null)?.block, now),
  );
}

// Gating only applies to the post's first page; delimiters can't be inserted
// elsewhere.
export function postHasMembersDelimiter(
  doc: NormalizedDocument | null,
  now: number = Date.now(),
): boolean {
  const pages = doc ? getDocumentPages(doc) : undefined;
  return !!pages?.[0] && pageHasMembersDelimiter(pages[0], now);
}

export type GatePolicy =
  | { audience: "subscribers" }
  | { audience: "paid" }
  | { audience: "tiers"; tierIds: string[] };

// An early-access gate can widen to everyone at its wider release.
export type AudiencePolicy = GatePolicy | { audience: "public" };

export const WIDER_RELEASE_DELAYS = [
  { value: "day", label: "1 day" },
  { value: "week", label: "1 week" },
  { value: "two-weeks", label: "2 weeks" },
  { value: "month", label: "1 month" },
] as const;
export type WiderReleaseDelay = (typeof WIDER_RELEASE_DELAYS)[number]["value"];

export function isWiderReleaseDelay(
  value: unknown,
): value is WiderReleaseDelay {
  return WIDER_RELEASE_DELAYS.some((d) => d.value === value);
}

export function widerReleaseTimeline(
  publishedAt: string,
  delay: WiderReleaseDelay,
): string | null {
  const date = new Date(publishedAt);
  if (isNaN(date.getTime())) return null;
  if (delay === "month") date.setUTCMonth(date.getUTCMonth() + 1);
  else
    date.setUTCDate(
      date.getUTCDate() + (delay === "day" ? 1 : delay === "week" ? 7 : 14),
    );
  return date.toISOString();
}

// Whether a timeline counted from publishedAt has already run out, so picking
// it would release the post as soon as it's published. Unpublished posts count
// from now.
export function isWiderReleaseTimelinePast(
  publishedAt: string | undefined,
  delay: WiderReleaseDelay,
  now: number = Date.now(),
): boolean {
  const at = publishedAt && widerReleaseTimeline(publishedAt, delay);
  return !!at && new Date(at).getTime() <= now;
}

// The delayed audience only ever adds readers: the gate after widerReleaseAt admits
// anyone either policy admits, so a narrower pick can't lock readers out.
export function widerReleaseAudience(a: GatePolicy, b: GatePolicy): GatePolicy;
export function widerReleaseAudience(
  a: AudiencePolicy,
  b: AudiencePolicy,
): AudiencePolicy;
export function widerReleaseAudience(
  a: AudiencePolicy,
  b: AudiencePolicy,
): AudiencePolicy {
  for (const audience of ["public", "subscribers", "paid"] as const)
    if (a.audience === audience || b.audience === audience) return { audience };
  return {
    audience: "tiers",
    tierIds: [
      ...new Set([
        ...(a.audience === "tiers" ? a.tierIds : []),
        ...(b.audience === "tiers" ? b.tierIds : []),
      ]),
    ],
  };
}

type MembersDelimiterBlock = {
  $type?: string;
  audience?: unknown;
  // Pre-audience lexicon shape: absent tiers meant every paid tier, a
  // non-empty list restricted to those tiers.
  tiers?: unknown;
  widerReleaseAt?: unknown;
  widerReleaseAudience?: { $type?: unknown; tierIds?: unknown };
};

// The $types of the pub.leaflet.audience union, the shape audiences are
// stored in outside the editor. Built from the NSID and checked against the
// generated def types, so a renamed lexicon or def fails typechecking after
// lexgen.
const AUDIENCE_NSID = ids.PubLeafletAudience;
export const AUDIENCE_UNION_TYPE = {
  public: `${AUDIENCE_NSID}#public`,
  subscribers: `${AUDIENCE_NSID}#subscribers`,
  paid: `${AUDIENCE_NSID}#paid`,
  tiers: `${AUDIENCE_NSID}#tiers`,
  follows: `${AUDIENCE_NSID}#follows`,
  followers: `${AUDIENCE_NSID}#followers`,
} as const satisfies {
  public: Required<AudienceLex.Public>["$type"];
  subscribers: Required<AudienceLex.Subscribers>["$type"];
  paid: Required<AudienceLex.Paid>["$type"];
  tiers: Required<AudienceLex.Tiers>["$type"];
  follows: Required<AudienceLex.Follows>["$type"];
  followers: Required<AudienceLex.Followers>["$type"];
};

export type AudienceUnion =
  | { $type: (typeof AUDIENCE_UNION_TYPE)["public"] }
  | { $type: (typeof AUDIENCE_UNION_TYPE)["subscribers"] }
  | { $type: (typeof AUDIENCE_UNION_TYPE)["paid"] }
  | { $type: (typeof AUDIENCE_UNION_TYPE)["tiers"]; tierIds: string[] };

export function toAudienceUnion(policy: AudiencePolicy): AudienceUnion {
  return policy.audience === "tiers"
    ? { $type: AUDIENCE_UNION_TYPE.tiers, tierIds: policy.tierIds }
    : { $type: AUDIENCE_UNION_TYPE[policy.audience] };
}

// Null for anything that isn't a valid member of the union.
export function fromAudienceUnion(value: unknown): AudiencePolicy | null {
  const type = (value as { $type?: unknown } | null | undefined)?.$type;
  for (const audience of ["public", "subscribers", "paid"] as const)
    if (type === AUDIENCE_UNION_TYPE[audience]) return { audience };
  if (type === AUDIENCE_UNION_TYPE.tiers) {
    const tierIds = stringIds((value as { tierIds?: unknown }).tierIds);
    return tierIds ? { audience: "tiers", tierIds } : null;
  }
  return null;
}

function widerReleaseReached(b: MembersDelimiterBlock, now: number) {
  if (typeof b.widerReleaseAt !== "string") return false;
  const at = new Date(b.widerReleaseAt).getTime();
  return !isNaN(at) && at <= now;
}

export function stringIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return [
    ...new Set(value.filter((id): id is string => typeof id === "string")),
  ];
}

// The audience a delimiter widens to at widerReleaseAt, or null when it has no
// valid wider release.
export function getWiderReleasePolicy(block: unknown): AudiencePolicy | null {
  const b = block as MembersDelimiterBlock | null | undefined;
  if (!b || typeof b.widerReleaseAt !== "string") return null;
  return fromAudienceUnion(b.widerReleaseAudience);
}

function findDelimiterBlock(blocks: unknown): MembersDelimiterBlock | null {
  if (!Array.isArray(blocks)) return null;
  return (
    blocks.find(
      (b) =>
        (b as { block?: MembersDelimiterBlock } | null)?.block?.$type ===
        ids.PubLeafletBlocksMembersOnlyDelimiter,
    )?.block ?? null
  );
}

// The first page's delimiter block, for callers that need its wider release.
export function getFirstPageMembersDelimiter(
  pages: unknown[] | undefined,
): MembersDelimiterBlock | null {
  return findDelimiterBlock(
    (pages?.[0] as { blocks?: unknown } | undefined)?.blocks,
  );
}

export type WiderRelease = { at: string; audience: AudiencePolicy };

// A post's early-access gate: when it widens and to whom. Callers compare
// `at` with the current time to tell early access from a past release.
export function getDocumentWiderRelease(
  doc: NormalizedDocument | null | undefined,
): WiderRelease | null {
  const block = getFirstPageMembersDelimiter(
    doc ? getDocumentPages(doc) : undefined,
  );
  const audience = getWiderReleasePolicy(block);
  return block && audience
    ? { at: block.widerReleaseAt as string, audience }
    : null;
}

export function isWiderReleasePending(
  release: WiderRelease | null | undefined,
  now: number = Date.now(),
): release is WiderRelease {
  if (!release) return false;
  const at = new Date(release.at).getTime();
  return !isNaN(at) && at > now;
}

export function isWiderReleasePassed(
  release: WiderRelease | null | undefined,
  now: number = Date.now(),
): release is WiderRelease {
  if (!release) return false;
  const at = new Date(release.at).getTime();
  return !isNaN(at) && at <= now;
}

// Whether a post still in early access will open to this reader at its wider
// release.
export function widerReleaseReaches(
  membership: ResolvedPublicationMembership | null | undefined,
  gatePolicy: GatePolicy | null | undefined,
  release: WiderRelease | null | undefined,
  now: number = Date.now(),
): release is WiderRelease {
  if (!isWiderReleasePending(release, now) || !gatePolicy) return false;
  if (release.audience.audience === "public") return true;
  return membershipUnlocksGatedPost(
    membership,
    widerReleaseAudience(gatePolicy, release.audience),
  );
}

// "3 days" until `at`, rounding a part-day up so the last day reads "1 day".
export function daysUntilLabel(at: string, now: number = Date.now()): string {
  const days = Math.max(
    1,
    Math.ceil((new Date(at).getTime() - now) / (24 * 60 * 60 * 1000)),
  );
  return days === 1 ? "1 day" : `${days} days`;
}

// Whether a delimiter's wider release is still ahead: the post is in early
// access.
export function isEarlyAccessPending(
  blocks: unknown,
  now: number = Date.now(),
): boolean {
  const block = findDelimiterBlock(blocks);
  return (
    !!block &&
    !!getWiderReleasePolicy(block) &&
    !widerReleaseReached(block, now)
  );
}

// Parse the policy stored on a delimiter, widened by its wider release once
// that has passed. Invalid policies remain invalid so a malformed or empty
// tier selection can never accidentally broaden access.
export function getMembersDelimiterGatePolicy(
  blocks: { block?: MembersDelimiterBlock }[] | undefined,
  now: number = Date.now(),
): GatePolicy | null {
  const block = findDelimiterBlock(blocks);
  if (!block) return null;
  const base = parseBaseGatePolicy(block);
  const delayed = widerReleaseReached(block, now)
    ? getWiderReleasePolicy(block)
    : null;
  if (!delayed || delayed.audience === "public") return base;
  return base ? widerReleaseAudience(base, delayed) : delayed;
}

function parseBaseGatePolicy(block: MembersDelimiterBlock): GatePolicy | null {
  if (block.audience !== undefined) {
    const policy = fromAudienceUnion(block.audience);
    return policy && policy.audience !== "public" ? policy : null;
  }
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
  now: number = Date.now(),
): GatePolicy | null {
  const pages = doc ? getDocumentPages(doc) : undefined;
  const first = pages?.[0] as
    | { blocks?: { block?: MembersDelimiterBlock }[] }
    | undefined;
  return getMembersDelimiterGatePolicy(first?.blocks, now);
}

// For render paths that work on a flat block list (RSS feed, newsletter
// email) and can't know who's reading: drop the delimiter and everything
// after it.
export function truncateBlocksAtMembersDelimiter<
  T extends { block?: { $type?: string } },
>(blocks: T[], now: number = Date.now()): T[] {
  const idx = blocks.findIndex((b) => isActiveMembersDelimiter(b?.block, now));
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
  const idx = first.blocks.findIndex((b) => isActiveMembersDelimiter(b?.block));
  if (idx === -1) return;
  first.blocks.splice(idx + 1);

  const reachable = new Set<string>();
  const collect = (page: PageLike) => {
    for (const b of page.blocks ?? []) {
      const block = b?.block;
      // A canvas's linear-document group can link pages from inside it.
      if (block?.$type === "pub.leaflet.pages.linearDocument") {
        collect(block as PageLike);
        continue;
      }
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

// Statuses under which a member still holds a live Stripe subscription on
// their tier's price. A canceled/incomplete row is history; these are the
// members a price change would leave on a price the tier no longer offers.
export const LIVE_MEMBERSHIP_STATUSES = ["active", "trialing", "past_due"];

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
