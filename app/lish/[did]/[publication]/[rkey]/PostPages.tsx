"use client";
import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AppBskyFeedDefs } from "@atproto/api";
import { create } from "zustand/react";
import {
  InteractionDrawer,
  useDrawerOpen,
} from "./Interactions/InteractionDrawer";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { PageOptionButton } from "components/Pages/PageOptions";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Fragment, useEffect } from "react";
import { flushSync } from "react-dom";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { useParams, useSearchParams } from "next/navigation";
import { decodeQuotePosition } from "./quotePosition";
import { PollData } from "./fetchPollData";
import { LinearDocumentPage } from "./LinearDocumentPage";
import { CanvasPage } from "./CanvasPage";
import { ThreadPage as ThreadPageComponent } from "./ThreadPage";
import { BlueskyQuotesPage } from "./BlueskyQuotesPage";

// Page types
export type DocPage = { type: "doc"; id: string };
export type ThreadPage = { type: "thread"; uri: string };
export type QuotesPage = { type: "quotes"; uri: string };
export type OpenPage = DocPage | ThreadPage | QuotesPage;

// Get a stable key for a page
const getPageKey = (page: OpenPage): string => {
  if (page.type === "doc") return page.id;
  if (page.type === "quotes") return `quotes:${page.uri}`;
  return `thread:${page.uri}`;
};

const usePostPageUIState = create(() => ({
  pages: [] as OpenPage[],
  initialized: false,
}));

export const useOpenPages = (): OpenPage[] => {
  const { quote } = useParams();
  const state = usePostPageUIState((s) => s);
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");

  if (!state.initialized) {
    // Check for page search param first (for comment links)
    if (pageParam) {
      return [{ type: "doc", id: pageParam }];
    }
    // Then check for quote param
    if (quote) {
      const decodedQuote = decodeQuotePosition(quote as string);
      if (decodedQuote?.pageId) {
        return [{ type: "doc", id: decodedQuote.pageId }];
      }
    }
  }

  return state.pages;
};

export const useInitializeOpenPages = () => {
  const { quote } = useParams();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");

  useEffect(() => {
    const state = usePostPageUIState.getState();
    if (!state.initialized) {
      // Check for page search param first (for comment links)
      if (pageParam) {
        usePostPageUIState.setState({
          pages: [{ type: "doc", id: pageParam }],
          initialized: true,
        });
        return;
      }
      // Then check for quote param
      if (quote) {
        const decodedQuote = decodeQuotePosition(quote as string);
        if (decodedQuote?.pageId) {
          usePostPageUIState.setState({
            pages: [{ type: "doc", id: decodedQuote.pageId }],
            initialized: true,
          });
          return;
        }
      }
      // Mark as initialized even if no pageId found
      usePostPageUIState.setState({ initialized: true });
    }
  }, [quote, pageParam]);
};

export const openPage = (
  parent: OpenPage | undefined,
  page: OpenPage,
  options?: { scrollIntoView?: boolean },
) => {
  const pageKey = getPageKey(page);
  const parentKey = parent ? getPageKey(parent) : undefined;

  flushSync(() => {
    usePostPageUIState.setState((state) => {
      let parentPosition = state.pages.findIndex(
        (s) => getPageKey(s) === parentKey,
      );
      return {
        pages:
          parentPosition === -1
            ? [page]
            : [...state.pages.slice(0, parentPosition + 1), page],
        initialized: true,
      };
    });
  });

  if (options?.scrollIntoView !== false) {
    scrollIntoView(`post-page-${pageKey}`);
  }
};

export const closePage = (page: OpenPage) => {
  const pageKey = getPageKey(page);
  usePostPageUIState.setState((state) => {
    let parentPosition = state.pages.findIndex(
      (s) => getPageKey(s) === pageKey,
    );
    return {
      pages: state.pages.slice(0, parentPosition),
      initialized: true,
    };
  });
};

// Shared props type for both page components
export type SharedPageProps = {
  document: PostPageData;
  did: string;
  profile: ProfileViewDetailed;
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showPrevNext?: boolean;
  };
  pubRecord?: PubLeafletPublication.Record;
  theme?: PubLeafletPublication.Theme | null;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pollData: PollData[];
  document_uri: string;
  fullPageScroll: boolean;
  hasPageBackground: boolean;
  pageId?: string;
  pageOptions?: React.ReactNode;
  allPages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
};

// Component that renders either Canvas or Linear page based on page type
function PageRenderer({
  page,
  ...sharedProps
}: {
  page: PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main;
} & SharedPageProps) {
  const isCanvas = PubLeafletPagesCanvas.isMain(page);

  if (isCanvas) {
    return (
      <CanvasPage
        {...sharedProps}
        blocks={(page as PubLeafletPagesCanvas.Main).blocks || []}
        pages={sharedProps.allPages}
      />
    );
  }

  return (
    <LinearDocumentPage
      {...sharedProps}
      blocks={(page as PubLeafletPagesLinearDocument.Main).blocks || []}
    />
  );
}

export function PostPages({
  document,
  did,
  profile,
  preferences,
  pubRecord,
  prerenderedCodeBlocks,
  bskyPostData,
  document_uri,
  pollData,
}: {
  document_uri: string;
  document: PostPageData;
  profile: ProfileViewDetailed;
  pubRecord?: PubLeafletPublication.Record;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showPrevNext?: boolean;
  };
  pollData: PollData[];
}) {
  let drawer = useDrawerOpen(document_uri);
  useInitializeOpenPages();
  let openPageIds = useOpenPages();
  if (!document) return null;

  let record = document.data as PubLeafletDocument.Record;
  let theme = pubRecord?.theme || record.theme || null;
  // For publication posts, respect the publication's showPageBackground setting
  // For standalone documents, default to showing page background
  let isInPublication = !!pubRecord;
  let hasPageBackground = isInPublication ? !!theme?.showPageBackground : true;
  let quotesAndMentions = document.quotesAndMentions;

  let firstPage = record.pages[0] as
    | PubLeafletPagesLinearDocument.Main
    | PubLeafletPagesCanvas.Main;

  // Canvas pages don't support fullPageScroll well due to fixed 1272px width
  let firstPageIsCanvas = PubLeafletPagesCanvas.isMain(firstPage);

  // Shared props used for all pages
  const sharedProps: SharedPageProps = {
    document,
    did,
    profile,
    preferences,
    pubRecord,
    theme,
    prerenderedCodeBlocks,
    bskyPostData,
    pollData,
    document_uri,
    hasPageBackground,
    allPages: record.pages as (
      | PubLeafletPagesLinearDocument.Main
      | PubLeafletPagesCanvas.Main
    )[],
    fullPageScroll:
      !hasPageBackground &&
      !drawer &&
      openPageIds.length === 0 &&
      !firstPageIsCanvas,
  };

  return (
    <>
      {!sharedProps.fullPageScroll && <BookendSpacer />}

      <PageRenderer page={firstPage} {...sharedProps} />

      {drawer && !drawer.pageId && (
        <InteractionDrawer
          document_uri={document.uri}
          comments={
            pubRecord?.preferences?.showComments === false
              ? []
              : document.comments_on_documents
          }
          quotesAndMentions={
            pubRecord?.preferences?.showMentions === false
              ? []
              : quotesAndMentions
          }
          did={did}
        />
      )}

      {openPageIds.map((openPage) => {
        const pageKey = getPageKey(openPage);

        // Handle thread pages
        if (openPage.type === "thread") {
          return (
            <Fragment key={pageKey}>
              <SandwichSpacer />
              <ThreadPageComponent
                threadUri={openPage.uri}
                pageId={pageKey}
                hasPageBackground={hasPageBackground}
                pageOptions={
                  <PageOptions
                    onClick={() => closePage(openPage)}
                    hasPageBackground={hasPageBackground}
                  />
                }
              />
            </Fragment>
          );
        }

        // Handle quotes pages
        if (openPage.type === "quotes") {
          return (
            <Fragment key={pageKey}>
              <SandwichSpacer />
              <BlueskyQuotesPage
                postUri={openPage.uri}
                pageId={pageKey}
                hasPageBackground={hasPageBackground}
                pageOptions={
                  <PageOptions
                    onClick={() => closePage(openPage)}
                    hasPageBackground={hasPageBackground}
                  />
                }
              />
            </Fragment>
          );
        }

        // Handle document pages
        let page = record.pages.find(
          (p) =>
            (
              p as
                | PubLeafletPagesLinearDocument.Main
                | PubLeafletPagesCanvas.Main
            ).id === openPage.id,
        ) as
          | PubLeafletPagesLinearDocument.Main
          | PubLeafletPagesCanvas.Main
          | undefined;

        if (!page) return null;

        return (
          <Fragment key={pageKey}>
            <SandwichSpacer />
            <PageRenderer
              page={page}
              {...sharedProps}
              fullPageScroll={false}
              pageId={page.id}
              pageOptions={
                <PageOptions
                  onClick={() => closePage(openPage)}
                  hasPageBackground={hasPageBackground}
                />
              }
            />
            {drawer && drawer.pageId === page.id && (
              <InteractionDrawer
                pageId={page.id}
                document_uri={document.uri}
                comments={
                  pubRecord?.preferences?.showComments === false
                    ? []
                    : document.comments_on_documents
                }
                quotesAndMentions={
                  pubRecord?.preferences?.showMentions === false
                    ? []
                    : quotesAndMentions
                }
                did={did}
              />
            )}
          </Fragment>
        );
      })}

      {!sharedProps.fullPageScroll && <BookendSpacer />}
    </>
  );
}

const PageOptions = (props: {
  onClick: () => void;
  hasPageBackground: boolean;
}) => {
  return (
    <div
      className={`pageOptions w-fit z-10
      absolute sm:-right-[19px] right-3 sm:top-3 top-0
      flex sm:flex-col flex-row-reverse gap-1 items-start`}
    >
      <PageOptionButton onClick={props.onClick}>
        <CloseTiny />
      </PageOptionButton>
    </div>
  );
};
