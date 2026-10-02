import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { AppBskyFeedDefs } from "@atproto/api";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import { canvasBlockBlocks } from "src/utils/pageBlocksInOrder";
import {
  canvasBlockOrder,
  canvasContentHeight,
  canvasStackOrders,
} from "src/utils/canvasBlockOrder";
import { CanvasBackgroundPattern } from "components/Canvas";
import { canvasBlockEdges } from "src/utils/blockSpacing";
import { CONTENT_WIDTH } from "src/canvasZoom/math";
import { visibleCanvasX } from "src/utils/embeddedCanvasSize";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
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

// A published canvas at full size, blocks in reading order (which block
// indexes count against). A drawing passes its size, which clips it and drops
// the grid; a publication's page passes its width.
export function CanvasBlocks({
  blocks,
  size,
  background,
  pattern,
  contentWidth = CONTENT_WIDTH,
  ...props
}: BlockDataProps & {
  blocks: PubLeafletPagesCanvas.Block[];
  size?: { width: number; height: number };
  background?: PubLeafletPagesCanvas.Background;
  pattern?: PubLeafletPagesCanvas.Main["pattern"];
  contentWidth?: number;
}) {
  let { width: canvasWidth, height } = size ?? {
    width: contentWidth,
    height: canvasContentHeight(blocks),
  };
  let sortedBlocks = [...blocks].sort(canvasBlockOrder);
  let stackOrders = canvasStackOrders(sortedBlocks);
  return (
    <div
      style={{
        width: canvasWidth,
        minHeight: height,
        height: size ? height : "100%",
        contain: "size layout paint",
      }}
      className="relative"
    >
      <CanvasBackground
        did={props.did}
        background={background}
        pattern={pattern}
        defaultPattern={size ? "plain" : "grid"}
      />
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
              transform: `translate(${visibleCanvasX(x, canvasWidth)}px, ${y}px)${rotation ? ` rotate(${rotation}deg)` : ""}`,
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

const CanvasBackground = (props: {
  did: string;
  background?: PubLeafletPagesCanvas.Background;
  pattern?: PubLeafletPagesCanvas.Main["pattern"];
  defaultPattern: "grid" | "plain";
}) => {
  let { background } = props;
  let pattern = (["grid", "dot", "plain"] as const).find(
    (p) => p === props.pattern,
  );
  let src = background && blobRefToSrc(background.image.ref, props.did);
  return (
    <div
      className="w-full h-full pointer-events-none"
      style={{
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
        backgroundSize: background?.width || 500,
        opacity:
          src && background?.opacity !== undefined
            ? background.opacity / 100
            : 1,
      }}
    >
      <CanvasBackgroundPattern pattern={pattern ?? props.defaultPattern} />
    </div>
  );
};
