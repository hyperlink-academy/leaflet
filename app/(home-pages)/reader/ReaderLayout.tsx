"use client";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import { GlobalContent } from "./GlobalContent";
import { InboxContent } from "./InboxContent";
import type { Cursor, Post } from "./getReaderFeed";

export function ReaderLayout(props: {
  readerFeedPromise: Promise<{ posts: Post[]; nextCursor: Cursor | null }>;
  hotFeedPromise: Promise<{ posts: Post[] }>;
  defaultTab: "Inbox" | "Trending";
}) {
  return (
    <DashboardLayout
      id="reader"
      currentPage="reader"
      defaultTab={props.defaultTab}
      pageTitle={<PageTitle icon={<ReaderUnreadSmall />} pageTitle="Reader" />}
      tabs={{
        Inbox: {
          content: (
            <DashboardPageLayout
              scrollKey="dashboard-reader-inbox"
              pageTitle="Inbox"
              showHeader={false}
            >
              <InboxContent promise={props.readerFeedPromise} />
            </DashboardPageLayout>
          ),
        },
        Trending: {
          content: (
            <DashboardPageLayout
              scrollKey="dashboard-reader-global"
              pageTitle="Trending"
              showHeader={false}
            >
              <GlobalContent promise={props.hotFeedPromise} />
            </DashboardPageLayout>
          ),
        },
      }}
    />
  );
}
