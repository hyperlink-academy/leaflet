"use client";
import { PreviewBlockList } from "components/Blocks/PreviewBlocks";
import { useEffect, useRef } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity } from "src/replicache";
import dynamic from "next/dynamic";
import styles from "./LeafletPreview.module.css";
import { PublicationMetadataPreview } from "components/Pages/PublicationMetadata";
import { recordLaunchMark } from "src/launchInstrumentation";

// The canvas renderer reaches every block component; only canvas leaflets pay
// for it.
const CanvasContent = dynamic(
  () => import("components/Canvas").then((m) => m.CanvasContent),
  { ssr: false },
);

export const LeafletContent = (props: {
  entityID: string;
  isOnScreen: boolean;
}) => {
  let type = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);

  // This is the first surface that actually renders replicache-backed content
  // for a home leaflet card, so its mount is the "local render" beat.
  useEffect(() => {
    recordLaunchMark("local-render");
  }, []);

  if (type === "canvas")
    return (
      <div
        className={`pageLinkBlockPreview shrink-0 h-full overflow-clip relative bg-bg-page shadow-sm  rounded-md`}
      >
        <div
          className={`absolute top-0 left-0 origin-top-left pointer-events-none ${styles.scaleLeafletCanvasPreview}`}
          style={{
            width: `1272px`,
            height: "calc(1272px * 2)",
          }}
        >
          {props.isOnScreen && (
            <CanvasContent entityID={props.entityID} preview />
          )}
        </div>
      </div>
    );

  return (
    <div
      ref={previewRef}
      className={`pageLinkBlockPreview h-full overflow-clip flex flex-col gap-0.5 no-underline relative`}
    >
      <div
        className={`absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none ${styles.scaleLeafletDocPreview}`}
        style={{
          width: `var(--page-width-units)`,
        }}
      >
        <PublicationMetadataPreview />

        {props.isOnScreen && (
          <PreviewBlockList
            blocks={blocks.slice(0, 10)}
            previewRef={previewRef}
          />
        )}
      </div>
    </div>
  );
};
