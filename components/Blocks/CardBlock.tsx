"use client";
import { BlockProps, BaseBlock, ListMarker, Block } from "./Block";
import { focusBlock } from "src/utils/focusBlock";

import { focusCard } from "components/Cards";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { RenderedTextBlock } from "components/Blocks/TextBlock";
import { useDocMetadata } from "src/hooks/queries/useDocMetadata";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";

export function CardBlock(props: BlockProps & { preview?: boolean }) {
  let { rep } = useReplicache();
  let card = useEntity(props.entityID, "block/card");
  let cardEntity = card ? card.data.value : props.entityID;
  let docMetadata = useDocMetadata(cardEntity);

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let isOpen = useUIState((s) => s.openCards).includes(cardEntity);

  return (
    <div
      style={{ "--list-marker-width": "20px" } as CSSProperties}
      className={`
        cardBlockWrapper relative group/cardBlock
        w-full h-[104px]
        bg-bg-card border shadow-sm outline outline-1 rounded-lg
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
          className="cardBlockContent w-full flex overflow-clip cursor-pointer"
          onClick={(e) => {
            if (e.isDefaultPrevented()) return;
            if (e.shiftKey) return;
            e.preventDefault();
            e.stopPropagation();
            useUIState.getState().openCard(props.parent, cardEntity);
            if (rep) focusCard(cardEntity, rep);
          }}
        >
          <div className="my-2 ml-3 grow min-w-0 text-sm bg-transparent overflow-clip ">
            {docMetadata[0] && (
              <div
                className={`cardBlockOne outline-none resize-none align-top flex gap-2 ${docMetadata[0].type === "heading" ? "font-bold text-base" : ""}`}
              >
                {docMetadata[0].listData && (
                  <ListMarker
                    {...docMetadata[0]}
                    className={
                      docMetadata[0].type === "heading"
                        ? "!pt-[12px]"
                        : "!pt-[8px]"
                    }
                  />
                )}
                <RenderedTextBlock entityID={docMetadata[0].value} />
              </div>
            )}
            {docMetadata[1] && (
              <div
                className={`cardBlockLineTwo outline-none resize-none align-top flex  gap-2 ${docMetadata[1].type === "heading" ? "font-bold" : ""}`}
              >
                {docMetadata[1].listData && (
                  <ListMarker {...docMetadata[1]} className="!pt-[8px]" />
                )}
                <RenderedTextBlock entityID={docMetadata[1].value} />
              </div>
            )}
            {docMetadata[2] && (
              <div
                className={`cardBlockLineThree outline-none resize-none align-top flex  gap-2 ${docMetadata[2].type === "heading" ? "font-bold" : ""}`}
              >
                {docMetadata[2].listData && (
                  <ListMarker {...docMetadata[2]} className="!pt-[8px]" />
                )}
                <RenderedTextBlock entityID={docMetadata[2].value} />
              </div>
            )}
          </div>
          {props.preview && <CardPreview entityID={cardEntity} />}
        </div>
      </>
    </div>
  );
}

export function CardPreview(props: { entityID: string }) {
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);

  let cardWidth = `var(--card-width-unitless)`;
  return (
    <div
      ref={previewRef}
      className={`cardBlockPreview w-[120px] overflow-clip  mx-3 mt-3 -mb-2 bg-bg-card border rounded-md shrink-0 border-border-light flex flex-col gap-0.5 rotate-[4deg] origin-center`}
    >
      <div
        className="absolute top-0 left-0  h-full origin-top-left pointer-events-none"
        style={{
          width: `calc(1px * ${cardWidth})`,
          transform: `scale(calc((120 / ${cardWidth} )))`,
        }}
      >
        {blocks.slice(0, 20).map((b, index, arr) => {
          return (
            <BlockPreview
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

export function BlockPreview(
  b: BlockProps & {
    previewRef: React.RefObject<HTMLDivElement>;
    size?: "small" | "large";
  },
) {
  let headingLevel = useEntity(b.value, "block/heading-level")?.data.value;
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
