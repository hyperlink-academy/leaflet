"use client";
import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { AppBskyFeedDefs } from "@atproto/api";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import { CanvasBlocks } from "../CanvasBlockContent";
import { PollData } from "../fetchPollData";

// Mirrors the editor's EmbeddedCanvasPreview: the whole canvas scaled to the
// block's width.
export function PublishedEmbeddedCanvasBlock(props: {
  page: PubLeafletPagesCanvas.Main & { width: number; height: number };
  did: string;
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  pollData: PollData[];
  pages: (PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main)[];
}) {
  let { page, ...data } = props;
  let size = { width: page.width, height: page.height };
  return (
    <div className="drawingBlock w-full block-border overflow-clip bg-bg-page">
      <div
        className="relative w-full overflow-clip"
        style={{
          aspectRatio: `${size.width} / ${size.height}`,
          containerType: "inline-size",
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(tan(atan2(100cqw, ${size.width}px)))`,
          }}
        >
          <CanvasBlocks {...data} blocks={page.blocks} size={size} preview />
        </div>
      </div>
    </div>
  );
}
