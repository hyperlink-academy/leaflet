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
import { useParams } from "next/navigation";
import { decodeQuotePosition } from "./quotePosition";
import { PollData } from "./fetchPollData";
import { LinearDocumentPage } from "./LinearDocumentPage";
import { CanvasPage } from "./CanvasPage";

const usePostPageUIState = create(() => ({
  pages: [] as string[],
  initialized: false,
}));

export const useOpenPages = () => {
  const { quote } = useParams();
  const state = usePostPageUIState((s) => s);

  if (!state.initialized && quote) {
    const decodedQuote = decodeQuotePosition(quote as string);
    if (decodedQuote?.pageId) {
      return [decodedQuote.pageId];
    }
  }

  return state.pages;
};

export const useInitializeOpenPages = () => {
  const { quote } = useParams();

  useEffect(() => {
    const state = usePostPageUIState.getState();
    if (!state.initialized) {
      if (quote) {
        const decodedQuote = decodeQuotePosition(quote as string);
        if (decodedQuote?.pageId) {
          usePostPageUIState.setState({
            pages: [decodedQuote.pageId],
            initialized: true,
          });
          return;
        }
      }
      // Mark as initialized even if no pageId found
      usePostPageUIState.setState({ initialized: true });
    }
  }, [quote]);
};

export const openPage = (
  parent: string | undefined,
  page: string,
  options?: { scrollIntoView?: boolean },
) => {
  flushSync(() => {
    usePostPageUIState.setState((state) => {
      let parentPosition = state.pages.findIndex((s) => s == parent);
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
    scrollIntoView(`post-page-${page}`);
  }
};

export const closePage = (page: string) =>
  usePostPageUIState.setState((state) => {
    let parentPosition = state.pages.findIndex((s) => s == page);
    return {
      pages: state.pages.slice(0, parentPosition),
      initialized: true,
    };
  });

// Shared props type for both page components
export type SharedPageProps = {
  document: PostPageData;
  did: string;
  profile: ProfileViewDetailed;
  preferences: { showComments?: boolean };
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
  preferences: { showComments?: boolean };
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
          quotesAndMentions={quotesAndMentions}
          did={did}
        />
      )}

      {openPageIds.map((pageId) => {
        let page = record.pages.find(
          (p) =>
            (
              p as
                | PubLeafletPagesLinearDocument.Main
                | PubLeafletPagesCanvas.Main
            ).id === pageId,
        ) as
          | PubLeafletPagesLinearDocument.Main
          | PubLeafletPagesCanvas.Main
          | undefined;

        if (!page) return null;

        return (
          <Fragment key={pageId}>
            <SandwichSpacer />
            <PageRenderer
              page={page}
              {...sharedProps}
              fullPageScroll={false}
              pageId={page.id}
              pageOptions={
                <PageOptions
                  onClick={() => closePage(page.id!)}
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
                quotesAndMentions={quotesAndMentions}
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
      absolute sm:-right-[20px] right-3 sm:top-3 top-0
      flex sm:flex-col flex-row-reverse gap-1 items-start`}
    >
      <PageOptionButton
        cardBorderHidden={!props.hasPageBackground}
        onClick={props.onClick}
      >
        <CloseTiny />
      </PageOptionButton>
    </div>
  );
};
