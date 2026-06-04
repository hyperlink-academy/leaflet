import { redirect } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import {
  PublicationSubscribers,
  type MergedSubscriber,
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

  const profiles = await getProfiles(Array.from(dids));

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
    });
  }

  return (
    <PublicationSubscribers
      subscribers={[...byDid.values(), ...emailOnly]}
      publicationShareUrl={getPublicationURL(pub)}
      publicationUri={pub.uri}
      showPageBackground={showPageBackground}
    />
  );
}
