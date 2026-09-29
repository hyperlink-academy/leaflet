"use client";
import type { ComponentProps } from "react";
import { PubLeafletPagesCanvas } from "lexicons/api";
import { CanvasBlocks } from "../CanvasBlockContent";
import { ScaledCanvas } from "components/Blocks/ScaledCanvas";

export function PublishedEmbeddedCanvasBlock({
  page,
  ...data
}: Omit<ComponentProps<typeof CanvasBlocks>, "blocks" | "size" | "preview"> & {
  page: PubLeafletPagesCanvas.Main & { width: number; height: number };
}) {
  let size = { width: page.width, height: page.height };
  return (
    <div className="drawingBlock w-full block-border overflow-clip bg-bg-page">
      <ScaledCanvas size={size}>
        <CanvasBlocks {...data} blocks={page.blocks} size={size} preview />
      </ScaledCanvas>
    </div>
  );
}
