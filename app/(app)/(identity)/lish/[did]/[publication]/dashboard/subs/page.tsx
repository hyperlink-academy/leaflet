import { redirect } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { isActiveMembership } from "src/membership";
import {
  PublicationSubscribers,
  type MergedSubscriber,
  type MemberTier,
  type SubscriberStatus,
} from "../PublicationSubscribers";

export default async function SubsPage(props: {
  params: Promise<{ did: string; publication: string }>;
}) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication = decodeURIComponent(params.publication);

  const { result } = await get_publication_data.handler(
    { did, publication_name: publication },
    { supabase: supabaseServerClient },
  );
  const pub = result.publication;
  if (!pub) {
    return (
      <PublicationSubscribers
        subscribers={[]}
        publicationShareUrl=""
        publicationUri=""
        showPageBackground={false}
        membershipsEnabled={false}
        tiers={[]}
      />
    );
  }

  const identity = await getIdentityData();
  const isOwner = !!identity?.atp_did && identity.atp_did === pub.identity_did;
  if (!isOwner) {
    redirect(`/lish/${params.did}/${params.publication}/dashboard`);
  }

  const record = normalizePublicationRecord(pub.record);
  const showPageBackground = !!record?.theme?.showPageBackground;
  const atprotoSubs = pub.publication_subscriptions || [];
  const newsletterEnabled = !!pub.publication_newsletter_settings?.enabled;
  const emailSubs = newsletterEnabled
    ? pub.publication_email_subscribers || []
    : [];

  const dids = new Set<string>();
  for (const s of atprotoSubs) {
    if (s.identities?.atp_did) dids.add(s.identities.atp_did);
  }
  for (const s of emailSubs) {
    if (s.identities?.atp_did) dids.add(s.identities.atp_did);
  }

  const [profiles, { data: memberRows }] = await Promise.all([
    getProfiles(Array.from(dids)),
    supabaseServerClient
      .from("publication_memberships")
      .select(
        "status, current_period_end, publication_membership_tiers(id, name), identities(atp_did, email)",
      )
      .eq("publication", pub.uri),
  ]);

  // Active paying members, keyed by both DID and email so we can tag whichever
  // subscriber-list identity they surface as.
  const memberTierByDid = new Map<string, MemberTier>();
  const memberTierByEmail = new Map<string, MemberTier>();
  for (const m of memberRows ?? []) {
    if (!isActiveMembership(m)) continue;
    // tier is ON DELETE SET NULL, so an active member can outlive their tier row
    const tier: MemberTier = m.publication_membership_tiers
      ? {
          id: m.publication_membership_tiers.id,
          name: m.publication_membership_tiers.name,
        }
      : { id: null, name: "Member" };
    const did = m.identities?.atp_did;
    const email = m.identities?.email;
    if (did) memberTierByDid.set(did, tier);
    if (email) memberTierByEmail.set(email, tier);
  }

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
      memberTier: memberTierByDid.get(d),
    });
  }

  for (const s of emailSubs) {
    const status: SubscriberStatus =
      s.state === "pending"
        ? "unconfirmed"
        : s.state === "unsubscribed"
          ? "unsubscribed"
          : "subscribed";
    const linkedDid = s.identities?.atp_did ?? undefined;
    const existing = linkedDid ? byDid.get(linkedDid) : undefined;
    if (existing && status === "subscribed") {
      existing.email = s.email;
      continue;
    }
    emailOnly.push({
      key: `email:${s.id}`,
      did: linkedDid,
      handle: linkedDid ? (profiles.get(linkedDid)?.handle ?? undefined) : undefined,
      email: s.email,
      created_at: s.created_at,
      status,
      memberTier:
        (linkedDid ? memberTierByDid.get(linkedDid) : undefined) ??
        (s.email ? memberTierByEmail.get(s.email) : undefined),
    });
  }

  const membershipsEnabled = !!pub.publication_membership_settings?.enabled;
  const tiers = (pub.publication_membership_tiers ?? [])
    .filter((t) => t.active)
    .sort(
      (a, b) =>
        a.monthly_price_cents - b.monthly_price_cents ||
        a.sort_order - b.sort_order,
    )
    .map((t) => ({ id: t.id, name: t.name, is_free: t.is_free }));

  return (
    <PublicationSubscribers
      subscribers={[...byDid.values(), ...emailOnly]}
      publicationShareUrl={getPublicationURL(pub)}
      publicationUri={pub.uri}
      showPageBackground={showPageBackground}
      membershipsEnabled={membershipsEnabled}
      tiers={tiers}
    />
  );
}
