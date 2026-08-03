import { redirect } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { getMyMemberships } from "actions/memberships";
import {
  getSubscriptions,
  getPublicationsByUris,
} from "app/(app)/(home-pages)/reader/getSubscriptions";
import { SubscriptionsPageContent } from "./SubscriptionsPageContent";

export default async function SubscriptionsPage() {
  const identity = await getIdentityData();
  if (!identity) redirect("/home");

  const [subs, membershipsData] = await Promise.all([
    getSubscriptions(identity.atp_did),
    getMyMemberships(),
  ]);
  const memberships = membershipsData?.memberships ?? [];
  const paidPubs = await getPublicationsByUris([
    ...new Set(memberships.map((m) => m.publication)),
  ]);

  return (
    <SubscriptionsPageContent
      did={identity.atp_did ?? ""}
      memberships={memberships}
      paidPubs={paidPubs}
      subscriptions={subs.subscriptions}
      nextCursor={subs.nextCursor}
    />
  );
}
