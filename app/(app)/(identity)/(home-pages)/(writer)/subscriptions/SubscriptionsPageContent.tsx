"use client";

import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";
import { ProfileSubscriptionsContent } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/subscriptions/SubscriptionsContent";
import type { PublicationSubscription } from "actions/reader/getSubscriptions";
import type { Cursor } from "actions/reader/getReaderFeed";
import {
  membershipPrice,
  isMembershipActive,
} from "components/Memberships/ChangePlanModal";
import type { MyMembership } from "actions/memberships";

export function SubscriptionsPageContent(props: {
  did: string;
  memberships: MyMembership[];
  paidPubs: PublicationSubscription[];
  subscriptions: PublicationSubscription[];
  emailOnlySubscriptions: PublicationSubscription[];
  nextCursor: Cursor | null;
}) {
  let pubsByUri = new Map(props.paidPubs.map((pub) => [pub.uri, pub]));
  let paid = props.memberships
    .filter((m) => isMembershipActive(m.status))
    .flatMap((m) => {
      let pub = pubsByUri.get(m.publication);
      return pub ? [{ membership: m, pub }] : [];
    });
  let paidUris = paid.map((p) => p.pub.uri);

  return (
    <DashboardPageLayout
      scrollKey="subscriptions"
      pageTitle="Your Subscriptions"
      showHeader={false}
    >
      <div className="w-full max-w-2xl flex flex-col gap-2">
        {paid.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3>Memberships</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
              {paid.map(({ membership, pub }) => {
                let price = membershipPrice(membership);
                return (
                  <div key={membership.id} className="flex flex-col gap-1">
                    <div className="text-sm font-bold text-secondary px-1">
                      {membership.tierName ?? "Membership"}
                      {price ? ` · ${price}` : ""}
                    </div>
                    <PubListing
                      constrainHeight
                      showSubscribeButton
                      subscribeSource={{ placement: "profile" }}
                      {...pub}
                    />
                  </div>
                );
              })}
            </div>
            <h3>All Subscriptions</h3>
          </div>
        )}
        <ProfileSubscriptionsContent
          did={props.did}
          subscriptions={props.subscriptions}
          nextCursor={props.nextCursor}
          prependSubscriptions={props.emailOnlySubscriptions}
          excludeUris={paidUris}
        />
      </div>
    </DashboardPageLayout>
  );
}
