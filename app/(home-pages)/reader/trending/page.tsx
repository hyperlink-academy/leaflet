import { Suspense } from "react";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { getHotFeed } from "../getHotFeed";
import { GlobalContent } from "../GlobalContent";
import { FeedSkeleton } from "../FeedSkeleton";
import { FeedLayout } from "../FeedLayout";

export default function ReaderTrendingPage() {
  return (
    <DashboardPageLayout
      scrollKey="dashboard-reader-trending"
      pageTitle="Trending"
      showHeader={false}
    >
      <Suspense fallback={<FeedSkeleton />}>
        <FeedLayout>
          <GlobalContent promise={getHotFeed()} />
        </FeedLayout>
      </Suspense>
    </DashboardPageLayout>
  );
}
