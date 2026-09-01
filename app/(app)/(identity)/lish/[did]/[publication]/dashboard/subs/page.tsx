import { redirect } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { buildMembershipTiers } from "src/membership";
import { PublicationSubscribers } from "../PublicationSubscribers";
import { mergePublicationSubscribers } from "../mergeSubscribers";

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
        tiers={null}
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
  const membershipsEnabled = !!pub.publication_membership_settings?.enabled;
  const tiers = membershipsEnabled
    ? buildMembershipTiers(
        pub.publication_membership_settings,
        pub.publication_membership_tiers ?? [],
      )
    : null;

  const channelDids = new Set<string>();
  for (const s of atprotoSubs) {
    if (s.identities?.atp_did) channelDids.add(s.identities.atp_did);
  }
  for (const s of emailSubs) {
    if (s.identities?.atp_did) channelDids.add(s.identities.atp_did);
  }

  const [{ data: memberRows }, channelProfiles] = await Promise.all([
    supabaseServerClient
      .from("publication_memberships")
      .select(
        "id, tier, status, current_period_end, created_at, publication_membership_tiers!publication_memberships_tier_publication_fkey(id, name), identities(atp_did, email)",
      )
      .eq("publication", pub.uri),
    getProfiles(Array.from(channelDids)),
  ]);

  const profiles = new Map(channelProfiles);
  const memberOnlyDids = new Set<string>();
  for (const m of memberRows ?? []) {
    const did = m.identities?.atp_did;
    if (did && !profiles.has(did)) memberOnlyDids.add(did);
  }
  if (memberOnlyDids.size > 0) {
    for (const [did, profile] of await getProfiles(
      Array.from(memberOnlyDids),
    )) {
      profiles.set(did, profile);
    }
  }

  const subscribers = mergePublicationSubscribers({
    atprotoSubs,
    emailSubs,
    memberRows: memberRows ?? [],
    profiles,
    tiers,
  });

  return (
    <PublicationSubscribers
      subscribers={subscribers}
      publicationShareUrl={getPublicationURL(pub)}
      publicationUri={pub.uri}
      showPageBackground={showPageBackground}
      tiers={tiers}
    />
  );
}
