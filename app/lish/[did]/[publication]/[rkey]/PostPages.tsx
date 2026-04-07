"use client";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
  PubLeafletPublication,
} from "lexicons/api";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { useLeafletContent } from "contexts/LeafletContentContext";
import { useDocument } from "contexts/DocumentContext";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AppBskyFeedDefs } from "@atproto/api";
import {
  InteractionDrawer,
  useDrawerOpen,
} from "./Interactions/InteractionDrawer";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { PageOptionButton } from "components/Pages/PageOptions";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Fragment } from "react";
import { PollData } from "./fetchPollData";
import { LinearDocumentPage } from "./LinearDocumentPage";
import { CanvasPage } from "./CanvasPage";
import { ThreadPage as ThreadPageComponent } from "./ThreadPage";
import { BlueskyQuotesPage } from "./BlueskyQuotesPage";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import {
  type OpenPage,
  type DocPage,
  type ThreadPage,
  type QuotesPage,
  getPageKey,
  useOpenPages,
  useInitializeOpenPages,
  openPage,
  closePage,
} from "./postPageState";

export type { DocPage, ThreadPage, QuotesPage, OpenPage };
export { getPageKey, useOpenPages, useInitializeOpenPages, openPage, closePage };

// Shared props type for both page components
export type SharedPageProps = {
  document: PostPageData;
  did: string;
  profile?: ProfileViewDetailed;
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
    showPrevNext?: boolean;
  };
  pubRecord?: NormalizedPublication | null;
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
  hasContentToRight?: boolean;
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
  profile?: ProfileViewDetailed;
  pubRecord?: NormalizedPublication | null;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
    showPrevNext?: boolean;
  };
  pollData: PollData[];
}) {
  let drawer = useDrawerOpen(document_uri);
  useInitializeOpenPages();
  let openPageIds = useOpenPages();
  const { pages } = useLeafletContent();
  const { quotesAndMentions } = useDocument();
  const record = document?.normalizedDocument;
  if (!document || !record) return null;

  let theme = pubRecord?.theme || record.theme || null;
  let hasPageBackground = !useCardBorderHidden();

  let firstPage = pages[0] as
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
    allPages: pages as (
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

      <PageRenderer
        page={firstPage}
        {...sharedProps}
        hasContentToRight={
          openPageIds.length > 0 || !!(drawer && !drawer.pageId)
        }
      />

      {drawer && !drawer.pageId && (
        <InteractionDrawer
          showPageBackground={pubRecord?.theme?.showPageBackground}
          document_uri={document.uri}
          comments={
            preferences.showComments === false
              ? []
              : document.comments_on_documents
          }
          quotesAndMentions={
            preferences.showMentions === false ? [] : quotesAndMentions
          }
          did={did}
        />
      )}

      {openPageIds.map((openPage, openPageIndex) => {
        const pageKey = getPageKey(openPage);

        // Handle thread pages
        if (openPage.type === "thread") {
          return (
            <Fragment key={pageKey}>
              <SandwichSpacer />
              <ThreadPageComponent
                parentUri={openPage.uri}
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
        let page = pages.find(
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
              hasContentToRight={
                openPageIndex < openPageIds.length - 1 ||
                !!(drawer && drawer.pageId === page.id)
              }
              pageOptions={
                <PageOptions
                  onClick={() => closePage(openPage)}
                  hasPageBackground={hasPageBackground}
                />
              }
            />
            {drawer && drawer.pageId === page.id && (
              <InteractionDrawer
                showPageBackground={pubRecord?.theme?.showPageBackground}
                pageId={page.id}
                document_uri={document.uri}
                comments={
                  preferences.showComments === false
                    ? []
                    : document.comments_on_documents
                }
                quotesAndMentions={
                  preferences.showMentions === false ? [] : quotesAndMentions
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
