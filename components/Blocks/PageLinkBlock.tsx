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
import { Canvas, CanvasBackground, CanvasContent } from "components/Canvas";
import { CardThemeProvider } from "components/ThemeManager/ThemeProvider";

export function PageLinkBlock(props: BlockProps & { preview?: boolean }) {
  let page = useEntity(props.entityID, "block/card");
  let type =
    useEntity(page?.data.value || null, "page/type")?.data.value || "doc";
  let { rep } = useReplicache();

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let isOpen = useUIState((s) => s.openPages).includes(page?.data.value || "");
  if (!page)
    return <div>An error occured, there should be a page linked here!</div>;

  return (
    <CardThemeProvider entityID={page?.data.value}>
      <div
        className={`w-full cursor-pointer
        pageLinkBlockWrapper relative group/pageLinkBlock
        bg-bg-page shadow-sm 
        flex overflow-clip
        ${isSelected ? "block-border-selected " : "block-border"}
        ${isOpen && "!border-tertiary"}
        `}
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
    </CardThemeProvider>
  );
}
export function DocLinkBlock(props: BlockProps & { preview?: boolean }) {
  let { rep } = useReplicache();
  let page = useEntity(props.entityID, "block/card");
  let pageEntity = page ? page.data.value : props.entityID;
  let leafletMetadata = usePageMetadata(pageEntity);

  return (
    <div
      style={{ "--list-marker-width": "20px" } as CSSProperties}
      className={`
        w-full h-[104px]
        `}
    >
      <>
        <div
          className="pageLinkBlockContent w-full flex overflow-clip cursor-pointer h-full"
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

  let cardBackgroundImage = useEntity(
    props.entityID,
    "theme/card-background-image",
  );
  let cardBackgroundImageRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );

  let cardBackgroundImageOpacity =
    useEntity(props.entityID, "theme/card-background-image-opacity")?.data
      .value || 1;

  let pageWidth = `var(--page-width-unitless)`;
  return (
    <div
      ref={previewRef}
      className={`pageLinkBlockPreview w-[120px] overflow-clip  mx-3 mt-3 -mb-2 bg-bg-page border rounded-md shrink-0 border-border-light flex flex-col gap-0.5 rotate-[4deg] origin-center`}
    >
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none "
        style={{
          width: `calc(1px * ${pageWidth})`,
          height: `calc(100vh - 64px)`,
          transform: `scale(calc((120 / ${pageWidth} )))`,
          backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
        }}
      >
        <div
          className={`pageBackground
      absolute top-0 left-0 right-0 bottom-0
      pointer-events-none
      `}
          style={{
            backgroundImage: `url(${cardBackgroundImage?.data.src}), url(${cardBackgroundImage?.data.fallback})`,
            backgroundRepeat: cardBackgroundImageRepeat
              ? "repeat"
              : "no-repeat",
            backgroundPosition: "center",
            backgroundSize: !cardBackgroundImageRepeat
              ? "cover"
              : cardBackgroundImageRepeat?.data.value,
            opacity: cardBackgroundImage?.data.src
              ? cardBackgroundImageOpacity
              : 1,
          }}
        />
        {blocks.slice(0, 20).map((b, index, arr) => {
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
}

const CanvasLinkBlock = (props: { entityID: string; preview?: boolean }) => {
  let pageWidth = `var(--page-width-unitless)`;
  return (
    <div
      style={{ contain: "size layout paint" }}
      className={`pageLinkBlockPreview shrink-0 h-[200px] w-full overflow-clip relative`}
    >
      <div
        className={`absolute top-0 left-0 origin-top-left pointer-events-none w-full`}
        style={{
          width: `calc(1px * ${pageWidth})`,
          height: "calc(1150px * 2)",
          transform: `scale(calc(((${pageWidth} - 36) / 1272 )))`,
        }}
      >
        {props.preview ? (
          <CanvasBackground entityID={props.entityID} />
        ) : (
          <CanvasContent entityID={props.entityID} preview />
        )}
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
