import { getIdentityData } from "actions/getIdentityData";

import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { ReaderContent } from "./ReaderContent";
import { SubscriptionsContent } from "./SubscriptionsContent";
import { getReaderFeed } from "./getReaderFeed";
import { getSubscriptions } from "./getSubscriptions";

export default async function Reader(props: {}) {
  let posts = await getReaderFeed();
  let publications = await getSubscriptions();
  return (
    <DashboardLayout
      id="reader"
      currentPage="reader"
      defaultTab="Read"
      actions={null}
      tabs={{
        Read: {
          controls: null,
          content: (
            <ReaderContent nextCursor={posts.nextCursor} posts={posts.posts} />
          ),
        },
        Subscriptions: {
          controls: null,
          content: (
            <SubscriptionsContent
              publications={publications.subscriptions}
              nextCursor={publications.nextCursor}
            />
          ),
        },
      }}
    />
  );
}
