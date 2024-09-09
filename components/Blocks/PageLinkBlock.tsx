"use client";
import { BlockProps, BaseBlock, ListMarker, Block } from "./Block";
import { focusBlock } from "src/utils/focusBlock";

import { focusPage } from "components/Pages";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { RenderedTextBlock } from "components/Blocks/TextBlock";
import { usePageMetadata } from "src/hooks/queries/usePageMetadata";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { Canvas, CanvasContent } from "components/Canvas";

export function PageLinkBlock(props: BlockProps & { preview?: boolean }) {
  let page = useEntity(props.entityID, "block/card");
  let type =
    useEntity(page?.data.value || null, "page/type")?.data.value || "doc";
  let { rep } = useReplicache();

  return (
    <div
      className="pageLinkBlockContent w-full cursor-pointer"
      onClick={(e) => {
        if (!page) return;
        if (e.isDefaultPrevented()) return;
        if (e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();
        useUIState.getState().openPage(props.parent, page.data.value);
        if (rep) focusPage(page.data.value, rep);
      }}
    >
      {type === "canvas" && page ? (
        <CanvasLinkBlock entityID={page?.data.value} />
      ) : (
        <DocLinkBlock {...props} />
      )}
    </div>
  );
}
export function DocLinkBlock(props: BlockProps & { preview?: boolean }) {
  let { rep } = useReplicache();
  let page = useEntity(props.entityID, "block/card");
  let pageEntity = page ? page.data.value : props.entityID;
  let leafletMetadata = usePageMetadata(pageEntity);

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let isOpen = useUIState((s) => s.openPages).includes(pageEntity);

  return (
    <div
      style={{ "--list-marker-width": "20px" } as CSSProperties}
      className={`
        pageLinkBlockWrapper relative group/pageLinkBlock
        w-full h-[104px]
        bg-bg-page border shadow-sm outline outline-1 rounded-lg
        flex overflow-clip
        ${
          isSelected
            ? "border-tertiary outline-tertiary"
            : isOpen
              ? "border-border outline-transparent hover:outline-border-light"
              : "border-border-light outline-transparent hover:outline-border-light"
        }
        `}
    >
      <>
        <div
          className="pageLinkBlockContent w-full flex overflow-clip cursor-pointer"
          onClick={(e) => {
            if (e.isDefaultPrevented()) return;
            if (e.shiftKey) return;
            e.preventDefault();
            e.stopPropagation();
            useUIState.getState().openPage(props.parent, pageEntity);
            if (rep) focusPage(pageEntity, rep);
          }}
        >
          <div className="my-2 ml-3 grow min-w-0 text-sm bg-transparent overflow-clip ">
            {leafletMetadata[0] && (
              <div
                className={`pageBlockOne outline-none resize-none align-top flex gap-2 ${leafletMetadata[0].type === "heading" ? "font-bold text-base" : ""}`}
              >
                {leafletMetadata[0].listData && (
                  <ListMarker
                    {...leafletMetadata[0]}
                    className={
                      leafletMetadata[0].type === "heading"
                        ? "!pt-[12px]"
                        : "!pt-[8px]"
                    }
                  />
                )}
                <RenderedTextBlock entityID={leafletMetadata[0].value} />
              </div>
            )}
            {leafletMetadata[1] && (
              <div
                className={`pageBlockLineTwo outline-none resize-none align-top flex  gap-2 ${leafletMetadata[1].type === "heading" ? "font-bold" : ""}`}
              >
                {leafletMetadata[1].listData && (
                  <ListMarker {...leafletMetadata[1]} className="!pt-[8px]" />
                )}
                <RenderedTextBlock entityID={leafletMetadata[1].value} />
              </div>
            )}
            {leafletMetadata[2] && (
              <div
                className={`pageBlockLineThree outline-none resize-none align-top flex  gap-2 ${leafletMetadata[2].type === "heading" ? "font-bold" : ""}`}
              >
                {leafletMetadata[2].listData && (
                  <ListMarker {...leafletMetadata[2]} className="!pt-[8px]" />
                )}
                <RenderedTextBlock entityID={leafletMetadata[2].value} />
              </div>
            )}
          </div>
          {props.preview && <PagePreview entityID={pageEntity} />}
        </div>
      </>
    </div>
  );
}

export function PagePreview(props: { entityID: string }) {
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);

  let pageWidth = `var(--page-width-unitless)`;
  let type = useEntity(props.entityID, "page/type")?.data.value || "doc";
  if (type === "canvas") return <CanvasLinkBlock entityID={props.entityID} />;
  return (
    <div
      ref={previewRef}
      className={`pageLinkBlockPreview w-[120px] overflow-clip  mx-3 mt-3 -mb-2 bg-bg-page border rounded-md shrink-0 border-border-light flex flex-col gap-0.5 rotate-[4deg] origin-center`}
    >
      <div
        className="absolute top-0 left-0  h-full origin-top-left pointer-events-none"
        style={{
          width: `calc(1px * ${pageWidth})`,
          transform: `scale(calc((120 / ${pageWidth} )))`,
        }}
      >
        {blocks.slice(0, 20).map((b, index, arr) => {
          return (
            <BlockPreview
              pageType={type}
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
}

const CanvasLinkBlock = (props: { entityID: string }) => {
  let pageWidth = `var(--page-width-unitless)`;
  return (
    <div
      className={`pageLinkBlockPreview shrink-0 h-[200px] w-full overflow-clip relative bg-bg-page shadow-sm border border-border-light rounded-md`}
    >
      <div
        className={`absolute top-0 left-0 origin-top-left pointer-events-none w-full`}
        style={{
          width: `calc(1px * ${pageWidth})`,
          height: "calc(1150px * 2)",
          transform: `scale(calc((${pageWidth} / 1150 )))`,
        }}
      >
        <CanvasContent entityID={props.entityID} preview />
      </div>
    </div>
  );
};

export function BlockPreview(
  b: BlockProps & {
    previewRef: React.RefObject<HTMLDivElement>;
  },
) {
  let ref = useRef<HTMLDivElement | null>(null);
  let [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    if (!ref.current) return;
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
      { threshold: 0.01, root: b.previewRef.current },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [b.previewRef]);
  return <div ref={ref}>{isVisible && <Block {...b} preview />}</div>;
}
