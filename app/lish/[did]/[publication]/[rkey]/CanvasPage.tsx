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

export function CanvasPage({
  document,
  blocks,
  did,
  profile,
  preferences,
  pubRecord,
  prerenderedCodeBlocks,
  bskyPostData,
  document_uri,
  pageId,
  pageOptions,
  fullPageScroll,
  pages,
}: {
  document_uri: string;
  document: PostPageData;
  blocks: PubLeafletPagesCanvas.Block[];
  profile: ProfileViewDetailed;
  pubRecord: PubLeafletPublication.Record;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  preferences: { showComments?: boolean };
  pageId?: string;
  pageOptions?: React.ReactNode;
  fullPageScroll: boolean;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
}) {
  let hasPageBackground = !!pubRecord.theme?.showPageBackground;
  let isSubpage = !!pageId;
  let drawer = useDrawerOpen(document_uri);

  return (
    <PageWrapper
      pageType="canvas"
      fullPageScroll={fullPageScroll}
      cardBorderHidden={!hasPageBackground}
      id={pageId ? `post-page-${pageId}` : "post-page"}
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
        commentsCount={getCommentCount(document, pageId)}
        quotesCount={getQuoteCount(document, pageId)}
      />
      <CanvasContent
        blocks={blocks}
        did={did}
        prerenderedCodeBlocks={prerenderedCodeBlocks}
        bskyPostData={bskyPostData}
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
  pages,
}: {
  blocks: PubLeafletPagesCanvas.Block[];
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pageId?: string;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
}) {
  let height = blocks.length > 0 ? Math.max(...blocks.map((b) => b.y), 0) : 0;

  return (
    <div className="canvasWrapper h-full w-fit overflow-y-scroll">
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
  pageId,
  pages,
  index,
}: {
  canvasBlock: PubLeafletPagesCanvas.Block;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
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
  preferences: { showComments?: boolean };
  quotesCount: number | undefined;
  commentsCount: number | undefined;
}) => {
  return (
    <div className="flex flex-row gap-3 items-center absolute sm:top-4 sm:right-4 bg-bg-page border-border-light rounded-md px-2 py-1 h-fit z-20">
      <Interactions
        quotesCount={props.quotesCount || 0}
        commentsCount={props.commentsCount || 0}
        compact
        showComments={props.preferences.showComments}
        pageId={props.pageId}
      />
      {!props.isSubpage && (
        <>
          <Separator classname="h-5" />
          <Popover
            side="left"
            align="start"
            className="flex flex-col gap-2 p-0! max-w-sm w-[1000px]"
            trigger={<InfoSmall />}
          >
            <PostHeader
              data={props.data}
              profile={props.profile}
              preferences={props.preferences}
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
