import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { getReaderFeed } from "./getReaderFeed";
import { InboxContent } from "./InboxContent";
import { FeedSkeleton } from "./FeedSkeleton";

export default async function ReaderPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await props.searchParams;
  if (tab === "Trending") redirect("/reader/trending");

  const identity = await getIdentityData();
  if (!identity?.atp_did) redirect("/reader/trending");

  return (
    <DashboardPageLayout
      scrollKey="dashboard-reader-inbox"
      pageTitle="Inbox"
      showHeader={false}
    >
      <Suspense fallback={<FeedSkeleton />}>
        <InboxContent promise={getReaderFeed()} />
      </Suspense>
    </DashboardPageLayout>
  );
}
