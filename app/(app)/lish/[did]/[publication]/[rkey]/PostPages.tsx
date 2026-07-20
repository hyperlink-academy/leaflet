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
import { InteractionDrawer } from "./Interactions/InteractionDrawer";
import { useInlineDrawer } from "./Interactions/useDrawerOpen";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { PageOptionButton } from "components/Pages/PageOptions";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Fragment } from "react";
import { PollData } from "./fetchPollData";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import { LinearDocumentPage } from "./LinearDocumentPage";
import { CanvasPage } from "./CanvasPage";
import { GlobalImageLightbox } from "./GlobalImageLightbox";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import {
  type OpenPage,
  getPageKey,
  useOpenPages,
  useInitializeOpenPages,
  openPage as openPageAction,
  closePage,
} from "./postPageState";
import { IframePageView } from "components/Pages/IframePageView";
import type { BylineProfile } from "./PostHeader/PostHeader";

export type { OpenPage };

// Shared props type for both page components
export type SharedPageProps = {
  document: PostPageData;
  did: string;
  profile?: ProfileViewDetailed;
  contributors?: BylineProfile[];
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
    showPrevNext?: boolean;
    showFirstLast?: boolean;
  };
  pubRecord?: NormalizedPublication | null;
  theme?: PubLeafletPublication.Theme | null;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
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
  contributors,
  preferences,
  pubRecord,
  prerenderedCodeBlocks,
  bskyPostData,
  standardSitePostData,
  document_uri,
  pollData,
  commentsSlot,
}: {
  document_uri: string;
  document: PostPageData;
  profile?: ProfileViewDetailed;
  contributors?: BylineProfile[];
  pubRecord?: NormalizedPublication | null;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
    showPrevNext?: boolean;
    showFirstLast?: boolean;
  };
  pollData: PollData[];
  commentsSlot: React.ReactNode;
}) {
  let drawer = useInlineDrawer(document_uri);
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
    contributors,
    preferences,
    pubRecord,
    theme,
    prerenderedCodeBlocks,
    bskyPostData,
    standardSitePostData,
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

      <GlobalImageLightbox />

      <PageRenderer
        page={firstPage}
        {...sharedProps}
        hasContentToRight={
          openPageIds.length > 0 || !!(drawer && !drawer.pageId)
        }
      />

      {/* Always mounted: the drawer reads its own open state and, on mobile,
          needs to stay mounted while its close animation plays. */}
      <InteractionDrawer
        showPageBackground={pubRecord?.theme?.showPageBackground}
        document_uri={document.uri}
        commentsSlot={preferences.showComments === false ? null : commentsSlot}
        quotesAndMentions={
          preferences.showMentions === false ? [] : quotesAndMentions
        }
        did={did}
      />

      {openPageIds.map((openPage, openPageIndex) => {
        const pageKey = getPageKey(openPage);

        // Handle iframe pages
        if (openPage.type === "iframe") {
          return (
            <Fragment key={pageKey}>
              <SandwichSpacer />
              <IframePageView
                url={openPage.url}
                onOpen={(url) => {
                  openPageAction(openPage, { type: "iframe", url });
                }}
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

        // Only document pages can be opened now; thread/quotes views render in
        // the interaction drawer rather than as their own pages.
        if (openPage.type !== "doc") return null;

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
            <InteractionDrawer
              showPageBackground={pubRecord?.theme?.showPageBackground}
              pageId={page.id}
              document_uri={document.uri}
              commentsSlot={
                preferences.showComments === false ? null : commentsSlot
              }
              quotesAndMentions={
                preferences.showMentions === false ? [] : quotesAndMentions
              }
              did={did}
            />
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
