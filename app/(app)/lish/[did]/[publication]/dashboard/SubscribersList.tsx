import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import {
  SubscribersListView,
  type MergedSubscriber,
  type SubscriberStatus,
} from "./PublicationSubscribers";

export async function SubscribersList({
  did,
  publication,
}: {
  did: string;
  publication: string;
}) {
  const { result } = await get_publication_data.handler(
    { did, publication_name: publication },
    { supabase: supabaseServerClient },
  );
  const pub = result.publication;
  if (!pub) {
    return (
      <SubscribersListView subscribers={[]} publicationShareUrl="" />
    );
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
    const d = s.identities?.atp_did ?? undefined;
    if (d) dids.add(d);
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
    const p = profiles.get(d);
    byDid.set(d, {
      key: `did:${d}`,
      did: d,
      handle: p?.handle ?? undefined,
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
    const p = linkedDid ? profiles.get(linkedDid) : null;
    emailOnly.push({
      key: `email:${s.id}`,
      did: linkedDid,
      handle: p?.handle ?? undefined,
      email: s.email,
      created_at: s.created_at,
      status,
    });
  }

  const subscribers = [...byDid.values(), ...emailOnly];

  return (
    <SubscribersListView
      subscribers={subscribers}
      publicationShareUrl={getPublicationURL(pub)}
      showPageBackground={showPageBackground}
    />
  );
}
