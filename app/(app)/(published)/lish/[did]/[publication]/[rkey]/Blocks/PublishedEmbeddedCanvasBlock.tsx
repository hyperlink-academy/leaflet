"use client";
import {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { AppBskyFeedDefs } from "@atproto/api";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import { CanvasBlocks } from "../CanvasBlockContent";
import { PollData } from "../fetchPollData";
import { ScaledCanvas } from "components/Blocks/ScaledCanvas";

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
      <ScaledCanvas size={size}>
        <CanvasBlocks {...data} blocks={page.blocks} size={size} preview />
      </ScaledCanvas>
    </div>
  );
}
