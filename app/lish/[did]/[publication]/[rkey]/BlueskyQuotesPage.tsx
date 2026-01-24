"use client";
import { AppBskyFeedDefs } from "@atproto/api";
import useSWR from "swr";
import { PageWrapper } from "components/Pages/Page";
import { useDrawerOpen } from "./Interactions/InteractionDrawer";
import { DotLoader } from "components/utils/DotLoader";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { openPage } from "./PostPages";
import { BskyPostContent } from "./BskyPostContent";
import {
  QuotesLink,
  getQuotesKey,
  fetchQuotes,
  prefetchQuotes,
} from "./PostLinks";

// Re-export for backwards compatibility
export { QuotesLink, getQuotesKey, fetchQuotes, prefetchQuotes };

type PostView = AppBskyFeedDefs.PostView;

export function BlueskyQuotesPage(props: {
  postUri: string;
  pageId: string;
  pageOptions?: React.ReactNode;
  hasPageBackground: boolean;
}) {
  const { postUri, pageId, pageOptions } = props;
  const drawer = useDrawerOpen(postUri);

  const {
    data: quotesData,
    isLoading,
    error,
  } = useSWR(postUri ? getQuotesKey(postUri) : null, () =>
    fetchQuotes(postUri),
  );

  return (
    <PageWrapper
      pageType="doc"
      fullPageScroll={false}
      id={`post-page-${pageId}`}
      drawerOpen={!!drawer}
      pageOptions={pageOptions}
    >
      <div className="flex flex-col sm:px-4 px-3 sm:pt-3 pt-2 pb-1 sm:pb-4">
        <h3 className="text-secondary font-bold flex items-center gap-2">
          Bluesky Quotes
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
            <span>loading quotes</span>
            <DotLoader />
          </div>
        ) : error ? (
          <div className="text-tertiary italic text-sm text-center py-8">
            Failed to load quotes
          </div>
        ) : quotesData && quotesData.posts.length > 0 ? (
          <QuotesContent posts={quotesData.posts} postUri={postUri} />
        ) : (
          <div className="text-tertiary italic text-sm text-center py-8">
            No quotes yet
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function QuotesContent(props: { posts: PostView[]; postUri: string }) {
  const { posts, postUri } = props;

  return (
    <div className="flex flex-col gap-0">
      {posts.map((post, index) => (
        <>
          <QuotePost key={post.uri} post={post} quotesUri={postUri} />
          {posts.length !== index + 1 && (
            <hr className="border-border-light my-2" />
          )}
        </>
      ))}
    </div>
  );
}

function QuotePost(props: { post: PostView; quotesUri: string }) {
  const { post, quotesUri } = props;
  const parent = { type: "quotes" as const, uri: quotesUri };

  return (
    <BskyPostContent
      post={post}
      parent={parent}
      showEmbed={true}
      compactEmbed
      showBlueskyLink={true}
      quoteEnabled
      replyEnabled
      onEmbedClick={(e) => e.stopPropagation()}
      className="relative py-2 px-2 hover:bg-bg-page rounded cursor-pointer text-sm"
    />
  );
}
