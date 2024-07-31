"use client";
import { Block, BlockProps, focusBlock, ListMarker } from "components/Blocks";
import { focusCard } from "components/Cards";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { RenderedTextBlock } from "components/Blocks/TextBlock";
import { useDocMetadata } from "src/hooks/queries/useDocMetadata";
import { CloseTiny } from "components/Icons";
import { useEffect, useRef, useState } from "react";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";

export function CardBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let card = useEntity(props.entityID, "block/card");
  let cardEntity = card ? card.data.value : props.entityID;
  let docMetadata = useDocMetadata(cardEntity);
  let permission = useEntitySetContext().permissions.write;

  let isSelected = useUIState(
    (s) =>
      (props.type !== "text" || s.selectedBlock.length > 1) &&
      s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let isOpen = useUIState((s) => s.openCards).includes(cardEntity);

  let [areYouSure, setAreYouSure] = useState(false);

  useEffect(() => {
    if (!isSelected) {
      setAreYouSure(false);
    }
  }, [isSelected]);

  useEffect(() => {
    if (isSelected) {
    }
  }, [isSelected]);

  useEffect(() => {
    if (!isSelected) return;
    let listener = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && permission) {
        if (e.defaultPrevented) return;
        if (areYouSure === false) {
          setAreYouSure(true);
        } else {
          e.preventDefault();
          useUIState.getState().closeCard(cardEntity);

          rep &&
            rep.mutate.removeBlock({
              blockEntity: props.entityID,
            });

          props.previousBlock &&
            focusBlock(props.previousBlock, { type: "end" });
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
    areYouSure,
    cardEntity,
    isSelected,
    permission,
    props.entityID,
    props.previousBlock,
    rep,
  ]);

  return (
    <div
      className={`
        cardBlockWrapper relative group/cardBlock
        w-full h-[104px]
        bg-bg-card border shadow-sm outline outline-1 rounded-lg
        flex overflow-clip
        ${isSelected ? "border-tertiary outline-tertiary " : isOpen ? "border-tertiary outline-transparent hover:outline-tertiary" : "border-border-light outline-transparent hover:outline-border-light"}
        `}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && permission) {
          e.stopPropagation();
          useUIState.getState().closeCard(cardEntity);

          rep &&
            rep.mutate.removeBlock({
              blockEntity: props.entityID,
            });
        }
      }}
    >
      {/* if the block is not focused, set are you sure to false*/}
      {areYouSure && isSelected ? (
        <div className="flex flex-col gap-1 w-full h-full place-items-center items-center font-bold py-4 bg-border-light">
          <div className="">Delete this Page?</div>
          <div className="flex gap-2">
            <button
              className="bg-accent-1 text-accent-2 px-2 py-1 rounded-md "
              onClick={(e) => {
                e.stopPropagation();
                useUIState.getState().closeCard(cardEntity);

                rep &&
                  rep.mutate.removeBlock({
                    blockEntity: props.entityID,
                  });
              }}
            >
              Delete
            </button>
            <button
              className="text-accent-1"
              onClick={() => setAreYouSure(false)}
            >
              Nevermind
            </button>
          </div>
        </div>
      ) : (
        <div
          className="cardBlockContent w-full flex overflow-clip cursor-pointer"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            useUIState.getState().openCard(props.parent, cardEntity);
            if (rep) focusCard(cardEntity, rep);
          }}
        >
          <div className="my-2 ml-3 grow min-w-0 text-sm bg-transparent overflow-clip ">
            {docMetadata[0] && (
              <div
                className={`cardBlockOne outline-none resize-none align-top flex gap-3 ${docMetadata[0].type === "heading" ? "font-bold text-base" : ""}`}
              >
                {docMetadata[0].listData && (
                  <ListMarker
                    {...docMetadata[0]}
                    compact
                    className={
                      docMetadata[0].type === "heading"
                        ? "top-[10px]"
                        : "top-[8px]"
                    }
                  />
                )}
                <RenderedTextBlock entityID={docMetadata[0].value} />
              </div>
            )}
            {docMetadata[1] && (
              <div
                className={`cardBlockLineTwo outline-none resize-none align-top flex  gap-3 ${docMetadata[1].type === "heading" ? "font-bold" : ""}`}
              >
                {docMetadata[1].listData && (
                  <ListMarker
                    {...docMetadata[1]}
                    compact
                    className="top-[8px]"
                  />
                )}
                <RenderedTextBlock entityID={docMetadata[1].value} />
              </div>
            )}
            {docMetadata[2] && (
              <div
                className={`cardBlockLineThree outline-none resize-none align-top flex  gap-3 ${docMetadata[2].type === "heading" ? "font-bold" : ""}`}
              >
                {docMetadata[2].listData && (
                  <ListMarker
                    {...docMetadata[2]}
                    compact
                    className="top-[8px]"
                  />
                )}

                <RenderedTextBlock entityID={docMetadata[2].value} />
              </div>
            )}
          </div>
          <CardPreview entityID={cardEntity} />
          {permission && (
            <button
              className="absolute p-1 top-0.5 right-0.5 hover:text-accent-contrast text-secondary sm:hidden sm:group-hover/cardBlock:block"
              onClick={(e) => {
                e.stopPropagation();
                setAreYouSure(true);
              }}
            >
              <CloseTiny />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CardPreview(props: { entityID: string }) {
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={previewRef}
      className={`cardBlockPreview w-[120px] overflow-clip p-1 mx-3 mt-3 -mb-2 bg-bg-card border rounded-md shrink-0 border-border-light flex flex-col gap-0.5 rotate-[4deg] origin-center`}
    >
      {blocks.slice(0, 10).map((b) => {
        return <BlockPreview previewRef={previewRef} {...b} key={b.factID} />;
      })}
    </div>
  );
}

export function BlockPreview(
  b: Block & {
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
      { threshold: 0.1, root: b.previewRef.current },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [b.previewRef]);
  if (b.listData)
    return (
      <div
        ref={ref}
        className="w-full flex flex-row"
        style={{ fontSize: "4px" }}
      >
        <div
          className="flex-shrink-0 relative"
          style={{ width: b.listData.depth * 4 }}
        >
          <div
            className={`absolute top-[] right-[2px] w-[1px] h-[1px] rounded-full bg-secondary ${
              b.type === "heading"
                ? headingLevel === 3
                  ? "top-[2.5px]"
                  : headingLevel === 2
                    ? "top-[3.5px]"
                    : "top-[4px]"
                : "top-[2.5px]"
            }`}
          />
        </div>

        {isVisible && <PreviewBlockContent {...b} size={b.size} />}
      </div>
    );
  return (
    <div ref={ref}>
      {isVisible && <PreviewBlockContent {...b} key={b.factID} size={b.size} />}
    </div>
  );
}

function PreviewBlockContent(props: Block & { size?: "small" | "large" }) {
  switch (props.type) {
    case "text": {
      return (
        <div style={{ fontSize: `${props.size === "large" ? "6px" : "4px"}` }}>
          <RenderedTextBlock entityID={props.value} className="p-0" />
        </div>
      );
    }
    case "link": {
      return (
        <div className="w-full h-5 shrink-0 rounded-md border border-border-light" />
      );
    }
    case "heading":
      return <HeadingPreviewBlock entityID={props.value} size={props.size} />;
    case "card":
      return (
        <div className="w-full h-5 shrink-0 rounded-md border border-border-light" />
      );
    case "image":
      return <ImagePreviewBlock entityID={props.value} />;
    default:
      null;
  }
}

function HeadingPreviewBlock(props: {
  entityID: string;
  size?: "small" | "large";
}) {
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  return (
    <div
      className={
        props.size === "large"
          ? LargeHeadingStyle[headingLevel?.data.value || 1]
          : HeadingStyle[headingLevel?.data.value || 1]
      }
    >
      <RenderedTextBlock entityID={props.entityID} className="p-0 " />
    </div>
  );
}

const HeadingStyle = {
  1: "text-[6px] font-bold",
  2: "text-[5px] font-bold ",
  3: "text-[4px] font-bold italic text-secondary ",
} as { [level: number]: string };

const LargeHeadingStyle = {
  1: "text-[9px] font-bold",
  2: "text-[7px] font-bold ",
  3: "text-[6px] font-bold italic text-secondary ",
} as { [level: number]: string };

function ImagePreviewBlock(props: { entityID: string }) {
  let image = useEntity(props.entityID, "block/image");
  return (
    <div className="relative group/image flex w-full justify-center">
      <img
        alt={""}
        src={image?.data.src}
        height={image?.data.height}
        width={image?.data.width}
        className=""
      />
    </div>
  );
}
