"use client";
import { BlockPreview } from "components/Blocks/PageLinkBlock";
import { useEffect, useRef, useState } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity } from "src/replicache";
import { CanvasContent } from "components/Canvas";
import styles from "./LeafletPreview.module.css";
import { PublicationMetadataPreview } from "components/Pages/PublicationMetadata";

export const LeafletContent = (props: { entityID: string; index: number }) => {
  let type = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);
  let [isVisible, setIsVisible] = useState(props.index > 16 ? false : true);
  useEffect(() => {
    if (!previewRef.current) return;
    let observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.1, root: null },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [previewRef]);

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
          {isVisible && <CanvasContent entityID={props.entityID} preview />}
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

        {isVisible &&
          blocks.slice(0, 10).map((b, index, arr) => {
            return (
              <BlockPreview
                pageType="doc"
                entityID={b.value}
                previousBlock={arr[index - 1] || null}
                nextBlock={arr[index + 1] || null}
                nextPosition={""}
                previewRef={previewRef}
                {...b}
                key={b.factID}
              />
            );
          })}
      </div>
    </div>
  );
};
