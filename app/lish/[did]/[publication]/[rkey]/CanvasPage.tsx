"use client";
import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AppBskyFeedDefs } from "@atproto/api";
import { PageWrapper } from "components/Pages/Page";
import { Block } from "./PostContent";
import { CanvasBackgroundPattern } from "components/Canvas";
import {
  getCommentCount,
  getQuoteCount,
  Interactions,
} from "./Interactions/Interactions";
import { Separator } from "components/Layout";
import { Popover } from "components/Popover";
import { InfoSmall } from "components/Icons/InfoSmall";
import { PostHeader } from "./PostHeader/PostHeader";
import { useDrawerOpen } from "./Interactions/InteractionDrawer";
import { PollData } from "./fetchPollData";
import { SharedPageProps } from "./PostPages";
import { useIsMobile } from "src/hooks/isMobile";

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
    preferences,
    pubRecord,
    theme,
    prerenderedCodeBlocks,
    bskyPostData,
    pollData,
    document_uri,
    pageId,
    pageOptions,
    fullPageScroll,
    hasPageBackground,
  } = props;
  if (!document) return null;

  let isSubpage = !!pageId;
  let drawer = useDrawerOpen(document_uri);

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
      <CanvasMetadata
        pageId={pageId}
        isSubpage={isSubpage}
        data={document}
        profile={profile}
        preferences={preferences}
        commentsCount={getCommentCount(document.comments_on_documents, pageId)}
        quotesCount={getQuoteCount(document.quotesAndMentions, pageId)}
        recommendsCount={document.recommendsCount}
      />
      <CanvasContent
        blocks={blocks}
        did={did}
        prerenderedCodeBlocks={prerenderedCodeBlocks}
        bskyPostData={bskyPostData}
        pollData={pollData}
        pageId={pageId}
        pages={pages}
      />
    </PageWrapper>
  );
}

function CanvasContent({
  blocks,
  did,
  prerenderedCodeBlocks,
  bskyPostData,
  pageId,
  pollData,
  pages,
}: {
  blocks: PubLeafletPagesCanvas.Block[];
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  pollData: PollData[];
  bskyPostData: AppBskyFeedDefs.PostView[];
  pageId?: string;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
}) {
  let height = blocks.length > 0 ? Math.max(...blocks.map((b) => b.y), 0) : 0;

  return (
    <div className="canvasWrapper h-full w-fit overflow-y-scroll postContent">
      <div
        style={{
          minHeight: height + 512,
          contain: "size layout paint",
        }}
        className="relative h-full w-[1272px]"
      >
        <CanvasBackground />

        {blocks
          .sort((a, b) => {
            if (a.y === b.y) {
              return a.x - b.x;
            }
            return a.y - b.y;
          })
          .map((canvasBlock, index) => {
            return (
              <CanvasBlock
                key={index}
                canvasBlock={canvasBlock}
                did={did}
                pollData={pollData}
                prerenderedCodeBlocks={prerenderedCodeBlocks}
                bskyPostData={bskyPostData}
                pageId={pageId}
                pages={pages}
                index={index}
              />
            );
          })}
      </div>
    </div>
  );
}

function CanvasBlock({
  canvasBlock,
  did,
  prerenderedCodeBlocks,
  bskyPostData,
  pollData,
  pageId,
  pages,
  index,
}: {
  canvasBlock: PubLeafletPagesCanvas.Block;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pollData: PollData[];
  pageId?: string;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  index: number;
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
        transform,
      }}
    >
      <div className="contents">
        <Block
          pollData={pollData}
          pageId={pageId}
          pages={pages}
          bskyPostData={bskyPostData}
          block={linearBlock}
          did={did}
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
  profile: ProfileViewDetailed;
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
    showPrevNext?: boolean;
  };
  quotesCount: number | undefined;
  commentsCount: number | undefined;
  recommendsCount: number;
}) => {
  let isMobile = useIsMobile();
  return (
    <div className="flex flex-row gap-3 items-center absolute top-3 right-3 sm:top-4 sm:right-4 bg-bg-page border-border-light rounded-md px-2 py-1 h-fit z-20">
      <Interactions
        quotesCount={props.quotesCount || 0}
        commentsCount={props.commentsCount || 0}
        recommendsCount={props.recommendsCount}
        showComments={props.preferences.showComments !== false}
        showMentions={props.preferences.showMentions !== false}
        showRecommends={props.preferences.showRecommends !== false}
        pageId={props.pageId}
      />
      {!props.isSubpage && (
        <>
          <Separator classname="h-5" />
          <Popover
            side="bottom"
            align="end"
            className={`flex flex-col gap-2 p-0! text-primary ${isMobile ? "w-full" : "max-w-sm w-[1000px] t"}`}
            trigger={<InfoSmall />}
          >
            <PostHeader
              data={props.data}
              profile={props.profile}
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
