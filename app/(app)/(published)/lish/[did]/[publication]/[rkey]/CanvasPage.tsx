"use client";
import { useIsMobile } from "src/hooks/isMobile";
import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { PostPageData } from "src/utils/getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { useMemo, useRef, type ComponentProps } from "react";
import { PageWrapper } from "components/Pages/Page";
import { CanvasZoomProvider } from "src/canvasZoom/CanvasZoomProvider";
import { CanvasZoomLayer } from "src/canvasZoom/CanvasZoomLayer";
import { CanvasOverlay } from "src/canvasZoom/CanvasOverlays";
import { useCanvasPageScroll } from "src/canvasZoom/pageScroll";
import { mobileViewArea, type CanvasArea } from "src/canvasZoom/mobileView";
import { CanvasZoomControls } from "components/CanvasZoomControls";
import { CanvasBlocks } from "./CanvasBlockContent";
import { canvasContentHeight } from "src/utils/canvasBlockOrder";
import { getQuoteCount, Interactions } from "./Interactions/Interactions";
import { Separator } from "components/Layout";
import { Popover } from "components/Popover";
import { InfoSmall } from "components/Icons/InfoSmall";
import { PostHeader, type BylineProfile } from "./PostHeader/PostHeader";
import { useInlineDrawer } from "./Interactions/useDrawerOpen";
import { DrawerThreadPageProvider } from "./Interactions/drawerThreadContext";
import { SharedPageProps } from "./PostPages";
import { usePostFrame } from "./postFrame";
import { PubLeafletBlocksPostHeader } from "lexicons/api";
import { PostHeaderBlockProvider } from "./PostHeader/postHeaderBlockContext";

export function CanvasPage({
  blocks,
  pages,
  mobileView,
  lockViewerZoom,
  ...props
}: Omit<SharedPageProps, "allPages"> & {
  blocks: PubLeafletPagesCanvas.Block[];
  mobileView?: PubLeafletPagesCanvas.Main["mobileView"];
  lockViewerZoom?: boolean;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
}) {
  const {
    document,
    did,
    profile,
    contributors,
    preferences,
    prerenderedCodeBlocks,
    bskyPostData,
    standardSitePostData,
    pollData,
    document_uri,
    pageId,
    pageOptions,
    fullPageScroll,
  } = props;
  let headerData = useMemo(
    () => ({ data: document, profile, contributors, preferences }),
    [document, profile, contributors, preferences],
  );
  if (!document) return null;

  let isSubpage = !!pageId;
  let drawer = useInlineDrawer(document_uri);
  // A header block on the canvas carries the metadata and interactions the
  // corner overlay would otherwise show.
  let hasHeaderBlock = blocks.some((b) =>
    PubLeafletBlocksPostHeader.isMain(b.block),
  );

  return (
    <PageWrapper
      pageType="canvas"
      fullPageScroll={fullPageScroll}
      id={`post-page-${pageId ?? document_uri}`}
      drawerOpen={
        !!drawer && (pageId ? drawer.pageId === pageId : !drawer.pageId)
      }
      pageOptions={pageOptions}
    >
      {!hasHeaderBlock && (
        <CanvasMetadata
          pageId={pageId}
          isSubpage={isSubpage}
          data={document}
          profile={profile}
          contributors={contributors}
          preferences={preferences}
          commentsCount={document.commentsCountByPage[pageId ?? ""] ?? 0}
          quotesCount={getQuoteCount(document.quotesAndMentions, pageId)}
          recommendsCount={document.recommendsCount}
        />
      )}
      <DrawerThreadPageProvider pageId={pageId}>
        <PostHeaderBlockProvider value={headerData}>
          <CanvasContent
            blocks={blocks}
            did={did}
            prerenderedCodeBlocks={prerenderedCodeBlocks}
            bskyPostData={bskyPostData}
            standardSitePostData={standardSitePostData}
            pollData={pollData}
            pageId={pageId}
            pages={pages}
            zoomKey={pageId ? `${document_uri}#${pageId}` : document_uri}
            mobileArea={mobileViewArea(mobileView)}
            lockViewerZoom={!!lockViewerZoom}
          />
        </PostHeaderBlockProvider>
      </DrawerThreadPageProvider>
    </PageWrapper>
  );
}

export function CanvasContent({
  zoomKey,
  mobileArea,
  lockViewerZoom,
  ...props
}: Omit<ComponentProps<typeof CanvasBlocks>, "preview"> & {
  zoomKey: string;
  mobileArea: CanvasArea | null;
  lockViewerZoom: boolean;
}) {
  let scrollerRef = useRef<HTMLDivElement>(null);
  let pageScroll = useCanvasPageScroll();

  return (
    // w-[1272px] max-w-full: the page keeps its full-canvas width while the
    // zoomed-out spacer shrinks, and the scroller (not the page card around
    // it) carries the horizontal overflow when zoomed in.
    <div
      className={`relative w-[1272px] max-w-full ${pageScroll ? "" : "h-full"}`}
    >
      <CanvasZoomProvider
        pageKey={zoomKey}
        scrollerRef={scrollerRef}
        pageScroll={pageScroll}
        initialArea={mobileArea}
        lockViewerZoom={lockViewerZoom}
      >
        <div
          ref={scrollerRef}
          className={`canvasWrapper w-full ${pageScroll ? "canvasPageScroll overflow-x-auto overflow-y-hidden" : "h-full overflow-y-scroll"} touch-pan-x touch-pan-y postContent`}
        >
          <CanvasZoomLayer
            contentHeight={canvasContentHeight(props.blocks)}
            mobileArea={mobileArea}
          >
            <CanvasBlocks {...props} preview={false} />
          </CanvasZoomLayer>
        </div>
        <CanvasOverlay edge="bottom">
          <CanvasZoomControls className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 bg-bg-page border border-border-light rounded-md px-1 py-0.5" />
        </CanvasOverlay>
      </CanvasZoomProvider>
    </div>
  );
}

const CanvasMetadata = (props: {
  pageId: string | undefined;
  isSubpage: boolean | undefined;
  data: PostPageData;
  profile?: ProfileViewDetailed;
  contributors?: BylineProfile[];
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
    showPrevNext?: boolean;
    showFirstLast?: boolean;
    prevNextDirection?: string;
  };
  quotesCount: number | undefined;
  commentsCount: number | undefined;
  recommendsCount: number;
}) => {
  let isMobile = useIsMobile();
  // Subpage counts are page-scoped, which no host chrome carries.
  let hideInteractions = !usePostFrame().headerInteractions && !props.isSubpage;
  return (
    <div className="flex flex-row gap-1 items-center absolute top-3 right-3 sm:top-4 sm:right-4 bg-bg-page border-border-light rounded-md px-2 py-1 h-fit z-20">
      {!hideInteractions && (
        <Interactions
          quotesCount={props.quotesCount || 0}
          commentsCount={props.commentsCount || 0}
          recommendsCount={props.recommendsCount}
          showComments={props.preferences.showComments !== false}
          showMentions={props.preferences.showMentions !== false}
          showRecommends={props.preferences.showRecommends !== false}
          pageId={props.pageId}
        />
      )}
      {!props.isSubpage && (
        <>
          {!hideInteractions && <Separator classname="h-5" />}
          <Popover
            side="bottom"
            align="end"
            className={`flex flex-col gap-2 p-0! text-primary ${isMobile ? "w-full" : "max-w-sm w-[1000px] t"}`}
            trigger={<InfoSmall />}
          >
            <PostHeader
              data={props.data}
              profile={props.profile}
              contributors={props.contributors}
              preferences={props.preferences}
              isCanvas
            />
          </Popover>
        </>
      )}
    </div>
  );
};
