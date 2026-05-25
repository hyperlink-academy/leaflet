import { Suspense } from "react";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { getNewFeed } from "../getNewFeed";
import { NewContent } from "../NewContent";
import { FeedSkeleton } from "../FeedSkeleton";
import { FeedLayout } from "../FeedLayout";

export default function NewPage() {
  return (
    <DashboardPageLayout
      scrollKey="dashboard-reader-new"
      pageTitle="New"
      showHeader={false}
    >
      <Suspense fallback={<FeedSkeleton />}>
        <FeedLayout>
          <NewContent promise={getNewFeed()} />
        </FeedLayout>
      </Suspense>
    </DashboardPageLayout>
  );
}
