"use client";
import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "src/utils/getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AppBskyFeedDefs } from "@atproto/api";
import { useMemo, useRef } from "react";
import { PageWrapper } from "components/Pages/Page";
import { CanvasZoomProvider } from "src/canvasZoom/CanvasZoomProvider";
import { CanvasZoomLayer } from "src/canvasZoom/CanvasZoomLayer";
import { CanvasZoomControls } from "components/CanvasZoomControls";
import { Block } from "./PostContent";
import {
  canvasBlockOrder,
  canvasStackOrders,
} from "src/utils/canvasBlockOrder";
import { CanvasBackgroundPattern } from "components/Canvas";
import { getQuoteCount, Interactions } from "./Interactions/Interactions";
import { Separator } from "components/Layout";
import { Popover } from "components/Popover";
import { InfoSmall } from "components/Icons/InfoSmall";
import {
  PostByline,
  PostHeader,
  type BylineProfile,
} from "./PostHeader/PostHeader";
import { useInlineDrawer } from "./Interactions/useDrawerOpen";
import { DrawerThreadPageProvider } from "./Interactions/drawerThreadContext";
import { PollData } from "./fetchPollData";
import { SharedPageProps } from "./PostPages";
import { usePostFrame } from "./postFrame";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import { useIsMobile } from "src/hooks/isMobile";
import { PubLeafletBlocksPostHeader } from "lexicons/api";
import { PostHeaderBlockProvider } from "./PostHeader/postHeaderBlockContext";

export function CanvasPage({
  blocks,
  pages,
  ...props
}: Omit<SharedPageProps, "allPages"> & {
  blocks: PubLeafletPagesCanvas.Block[];
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
}) {
  const {
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
    pageId,
    pageOptions,
    fullPageScroll,
    hasPageBackground,
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
          />
        </PostHeaderBlockProvider>
      </DrawerThreadPageProvider>
    </PageWrapper>
  );
}

function CanvasContent({
  blocks,
  did,
  prerenderedCodeBlocks,
  bskyPostData,
  standardSitePostData,
  pageId,
  pollData,
  pages,
  zoomKey,
}: {
  blocks: PubLeafletPagesCanvas.Block[];
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  pollData: PollData[];
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  pageId?: string;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  zoomKey: string;
}) {
  let scrollerRef = useRef<HTMLDivElement>(null);
  let sortedBlocks = useMemo(
    () => [...blocks].sort(canvasBlockOrder),
    [blocks],
  );
  let stackOrders = useMemo(
    () => canvasStackOrders(sortedBlocks),
    [sortedBlocks],
  );
  let height =
    sortedBlocks.length > 0 ? Math.max(...sortedBlocks.map((b) => b.y), 0) : 0;

  return (
    <CanvasZoomProvider pageKey={zoomKey} scrollerRef={scrollerRef}>
      {/* w-[1272px] max-w-full: the page keeps its full-canvas width while
          the zoomed-out spacer shrinks, and the scroller (not the page card
          around it) carries the horizontal overflow when zoomed in. */}
      <div
        ref={scrollerRef}
        className="canvasWrapper h-full w-[1272px] max-w-full overflow-y-scroll touch-pan-x touch-pan-y postContent"
      >
        <CanvasZoomLayer contentHeight={height + 512}>
          <div
            style={{
              minHeight: height + 512,
              contain: "size layout paint",
            }}
            className="relative h-full w-[1272px]"
          >
            <CanvasBackground />

            {sortedBlocks.map((canvasBlock, index) => {
              return (
                <CanvasBlock
                  key={index}
                  canvasBlock={canvasBlock}
                  did={did}
                  pollData={pollData}
                  prerenderedCodeBlocks={prerenderedCodeBlocks}
                  bskyPostData={bskyPostData}
                  standardSitePostData={standardSitePostData}
                  pageId={pageId}
                  pages={pages}
                  index={index}
                  stackOrder={stackOrders[index]}
                />
              );
            })}
          </div>
        </CanvasZoomLayer>
      </div>
      <CanvasZoomControls className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 bg-bg-page border border-border-light rounded-md px-1 py-0.5" />
    </CanvasZoomProvider>
  );
}

function CanvasBlock({
  canvasBlock,
  did,
  prerenderedCodeBlocks,
  bskyPostData,
  standardSitePostData,
  pollData,
  pageId,
  pages,
  index,
  stackOrder,
}: {
  canvasBlock: PubLeafletPagesCanvas.Block;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  pollData: PollData[];
  pageId?: string;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  index: number;
  stackOrder: number;
}) {
  let { x, y, width, rotation } = canvasBlock;
  let transform = `translate(${x}px, ${y}px)${rotation ? ` rotate(${rotation}deg)` : ""}`;

  // Wrap the block in a LinearDocument.Block structure for compatibility
  let linearBlock: PubLeafletPagesLinearDocument.Block = {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: canvasBlock.block,
  };

  return (
    <div
      className="absolute rounded-lg flex items-stretch origin-center p-3"
      style={{
        top: 0,
        left: 0,
        width,
        zIndex: stackOrder,
        transform,
      }}
    >
      <div className="contents">
        <Block
          pollData={pollData}
          pageId={pageId}
          pages={pages}
          bskyPostData={bskyPostData}
          standardSitePostData={standardSitePostData}
          block={linearBlock}
          did={did}
          canvasWidth={width}
          index={[index]}
          preview={false}
          prerenderedCodeBlocks={prerenderedCodeBlocks}
        />
      </div>
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

const CanvasBackground = () => {
  return (
    <div className="w-full h-full pointer-events-none">
      <CanvasBackgroundPattern pattern="grid" />
    </div>
  );
};
