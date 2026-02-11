import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { InboxContent } from "./InboxContent";
import { GlobalContent } from "./GlobalContent";
import { getReaderFeed } from "./getReaderFeed";

export default async function Reader(props: {}) {
  let posts = await getReaderFeed();
  return (
    <DashboardLayout
      id="reader"
      currentPage="reader"
      defaultTab="Subs"
      actions={null}
      tabs={{
        Subs: {
          controls: (
            <div className="place-self-end text text-tertiary text-sm">
              Publications
            </div>
          ),
          content: (
            <InboxContent nextCursor={posts.nextCursor} posts={posts.posts} />
          ),
        },
        Global: {
          controls: null,
          content: <GlobalContent />,
        },
      }}
    />
  );
}
