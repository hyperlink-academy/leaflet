import { resolvePublicationMembership, type MembershipTiers } from "src/membership";
import type {
  MergedSubscriber,
  MemberTier,
  SubscriberStatus,
} from "./PublicationSubscribers";

// Merges a publication's three independent subscriber sources — atproto
// subscriptions, email subscribers, and paid membership rows — into one
// roster keyed by DID where possible and by email otherwise. Paid rows are
// billing state, not a channel of their own, so they're folded into whichever
// channel row already represents that person (or added directly if neither
// channel has mirrored them yet). Pulled out so any other surface needing the
// full subscriber+paid-status roster (CSV export, subscriber counts, …) can
// reuse this instead of re-deriving it.
export function mergePublicationSubscribers<
  AtprotoSub extends {
    identities: { atp_did: string | null } | null;
    created_at: string;
  },
  EmailSub extends {
    id: string;
    email: string;
    created_at: string;
    state: string | null;
    identities: { atp_did: string | null } | null;
  },
  MemberRow extends {
    id: string;
    tier: string;
    status: string | null;
    current_period_end: string | null;
    created_at: string;
    publication_membership_tiers: { id: string; name: string } | null;
    identities: { atp_did: string | null; email: string | null } | null;
  },
>(input: {
  atprotoSubs: AtprotoSub[];
  emailSubs: EmailSub[];
  memberRows: MemberRow[];
  profiles: Map<string, { handle: string | null } | null>;
  tiers: MembershipTiers | null;
}): MergedSubscriber[] {
  const { atprotoSubs, emailSubs, memberRows, profiles, tiers } = input;

  // Persisted paid rows are keyed by both DID and email so the centralized
  // resolver can combine one with whichever subscriber-list identity surfaces.
  const paidMembershipByDid = new Map<string, MemberRow>();
  const paidMembershipByEmail = new Map<string, MemberRow>();
  for (const m of memberRows) {
    const did = m.identities?.atp_did;
    const email = m.identities?.email;
    if (did) paidMembershipByDid.set(did, m);
    if (email) paidMembershipByEmail.set(email.toLowerCase(), m);
  }

  const resolveMemberTier = (
    isSubscriber: boolean,
    paid: MemberRow | null | undefined,
  ): MemberTier | undefined => {
    const membership = resolvePublicationMembership({
      isSubscriber,
      paidMembership: paid
        ? {
            status: paid.status,
            current_period_end: paid.current_period_end,
            tier: paid.tier,
          }
        : null,
    });
    if (!membership) return undefined;
    if (membership.kind === "free")
      return tiers
        ? { kind: "subscriber", name: tiers.subscriber.name }
        : undefined;
    const tier = paid?.publication_membership_tiers;
    return tier ? { kind: "paid", id: tier.id, name: tier.name } : undefined;
  };

  const byDid = new Map<string, MergedSubscriber>();
  const emailOnly: MergedSubscriber[] = [];

  for (const s of atprotoSubs) {
    const d = s.identities?.atp_did ?? undefined;
    if (!d) continue;
    byDid.set(d, {
      key: `did:${d}`,
      did: d,
      handle: profiles.get(d)?.handle ?? undefined,
      email: undefined,
      created_at: s.created_at,
      status: "subscribed",
      memberTier: resolveMemberTier(true, paidMembershipByDid.get(d)),
    });
  }

  for (const s of emailSubs) {
    const linkedDid = s.identities?.atp_did ?? undefined;
    const paid =
      (linkedDid ? paidMembershipByDid.get(linkedDid) : undefined) ??
      paidMembershipByEmail.get(s.email.toLowerCase());
    const paidTier = resolveMemberTier(false, paid);
    const status: SubscriberStatus =
      paidTier?.kind === "paid"
        ? "subscribed"
        : s.state === "pending"
          ? "unconfirmed"
          : s.state === "unsubscribed"
            ? "unsubscribed"
            : "subscribed";
    const existing = linkedDid ? byDid.get(linkedDid) : undefined;
    if (existing && status === "subscribed") {
      existing.email = s.email;
      continue;
    }
    emailOnly.push({
      key: `email:${s.id}`,
      did: linkedDid,
      handle: linkedDid
        ? profiles.get(linkedDid)?.handle ?? undefined
        : undefined,
      email: s.email,
      created_at: s.created_at,
      status,
      memberTier: resolveMemberTier(status === "subscribed", paid),
    });
  }

  // Subscriber mirroring after a paid join is best-effort, so the billing row
  // must also be a roster source. Merge it into an existing channel row when
  // possible; otherwise add the member directly. An active paid relationship
  // remains subscribed even when its email delivery row is muted.
  for (const m of memberRows) {
    const memberTier = resolveMemberTier(false, m);
    if (memberTier?.kind !== "paid") continue;
    const did = m.identities?.atp_did ?? undefined;
    const email = m.identities?.email ?? undefined;
    const didSubscriber = did ? byDid.get(did) : undefined;
    if (didSubscriber) {
      didSubscriber.email ??= email;
      didSubscriber.status = "subscribed";
      didSubscriber.memberTier = memberTier;
      continue;
    }

    const channelSubscriber = emailOnly.find(
      (subscriber) =>
        (!!did && subscriber.did === did) ||
        (!!email && subscriber.email?.toLowerCase() === email.toLowerCase()),
    );
    if (channelSubscriber) {
      channelSubscriber.status = "subscribed";
      channelSubscriber.memberTier = memberTier;
      continue;
    }

    const member: MergedSubscriber = {
      key: `member:${m.id}`,
      did,
      handle: did ? profiles.get(did)?.handle ?? undefined : undefined,
      email,
      created_at: m.created_at,
      status: "subscribed",
      memberTier,
    };
    if (did) byDid.set(did, member);
    else emailOnly.push(member);
  }

  return [...byDid.values(), ...emailOnly];
}
