"use client";

import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { SubscriberStatusFilter } from "components/PageLayouts/PageSearch";
import { PublicationSubscribers } from "../PublicationSubscribers";
import { NewDraftActionButton } from "../NewDraftButton";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";

export default function SubsPage() {
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let pubUri = data?.publication?.uri || "";
  const showPageBackground = !!record?.theme?.showPageBackground;

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${pubUri}-Subs`}
      pageTitle="Subscribers"
      mobileActions={<NewDraftActionButton publication={pubUri} compact />}
      publication={pubUri}
      showHeader={false}
    >
      <div className="flex justify-end text-sm text-tertiary">
        <SubscriberStatusFilter />
      </div>
      <PublicationSubscribers showPageBackground={showPageBackground} />
    </DashboardPageLayout>
  );
}
