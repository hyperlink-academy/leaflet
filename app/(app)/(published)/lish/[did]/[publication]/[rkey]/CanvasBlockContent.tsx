"use client";
import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { AppBskyFeedDefs } from "@atproto/api";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import { useMemo } from "react";
import { canvasBlockBlocks } from "src/utils/pageBlocksInOrder";
import {
  canvasBlockOrder,
  canvasContentHeight,
  canvasStackOrders,
} from "src/utils/canvasBlockOrder";
import { CanvasBackgroundPattern } from "components/Canvas";
import { canvasBlockEdges } from "src/utils/blockSpacing";
import { Block } from "./PostContent";
import { PollData } from "./fetchPollData";

type BlockDataProps = {
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  pollData: PollData[];
  pageId?: string;
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
  preview: boolean;
};

// A published canvas laid out at full size: the grid and the blocks, placed
// and stacked, in reading order (which block indexes are counted against).
// The canvas page scrolls and zooms this; a page link scales it down. A
// sized canvas (an embedded canvas) is clipped to its size and shown without the grid.
export function CanvasBlocks({
  blocks,
  size,
  ...props
}: BlockDataProps & {
  blocks: PubLeafletPagesCanvas.Block[];
  size?: { width: number; height: number };
}) {
  let sortedBlocks = useMemo(
    () => [...blocks].sort(canvasBlockOrder),
    [blocks],
  );
  let stackOrders = useMemo(
    () => canvasStackOrders(sortedBlocks),
    [sortedBlocks],
  );
  return (
    <div
      style={{
        ...(size
          ? { width: size.width, height: size.height }
          : { minHeight: canvasContentHeight(blocks) }),
        contain: "size layout paint",
      }}
      className={`relative ${size ? "" : "h-full w-[1272px]"}`}
    >
      {!size && (
        <div className="w-full h-full pointer-events-none">
          <CanvasBackgroundPattern pattern="grid" />
        </div>
      )}
      {sortedBlocks.map((canvasBlock, index) => {
        let { x, y, width, rotation } = canvasBlock;
        return (
          <div
            key={index}
            className="absolute rounded-lg flex items-stretch origin-center p-3"
            style={{
              top: 0,
              left: 0,
              width,
              zIndex: stackOrders[index],
              transform: `translate(${x}px, ${y}px)${rotation ? ` rotate(${rotation}deg)` : ""}`,
            }}
          >
            <CanvasBlockContent
              {...props}
              canvasBlock={canvasBlock}
              index={index}
              // A scaled-down link preview needs no more than body-width images.
              canvasWidth={props.preview ? undefined : width}
            />
          </div>
        );
      })}
    </div>
  );
}

// The content of one canvas block: a linear-document group laid out like a
// doc page's block list inside the canvas block's frame, or a lone block.
function CanvasBlockContent({
  canvasBlock,
  index,
  ...props
}: BlockDataProps & {
  canvasBlock: PubLeafletPagesCanvas.Block;
  index: number;
  canvasWidth?: number;
}) {
  let isGroup = PubLeafletPagesLinearDocument.isMain(canvasBlock.block);
  let blocks = canvasBlockBlocks(canvasBlock, index);
  return (
    <div
      className={`${isGroup ? "flow-root w-full" : "contents"} ${canvasBlockEdges}`}
    >
      {blocks.map((b, i) => (
        <Block
          {...props}
          key={i}
          block={b.block}
          index={b.index}
          previousBlock={blocks[i - 1]?.block}
          nextBlock={blocks[i + 1]?.block}
          isFirst={isGroup && i === 0}
          isLast={isGroup && i === blocks.length - 1}
        />
      ))}
    </div>
  );
}
