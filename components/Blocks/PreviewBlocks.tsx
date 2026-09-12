"use client";
import { useEffect, useRef, useState } from "react";
import { useEntity } from "src/replicache";
import { usePageMetadata } from "src/hooks/queries/usePageMetadata";
import { CheckboxChecked } from "components/Icons/CheckboxChecked";
import { CheckboxEmpty } from "components/Icons/CheckboxEmpty";
import { RenderedTextBlock } from "./TextBlock/RenderedTextBlock";
import type { Block, BlockProps } from "./Block";

// Read-only, inert rendering of a block list, for the leaflet cards on /home and
// the page-link previews. It deliberately mirrors Block.tsx's layout rather than
// reusing it: Block.tsx reaches every block renderer, and through them
// prosemirror, katex, shiki and dnd-kit, none of which a preview can interact
// with anyway.

type PreviewProps = Block & {
  previousBlock: Block | null;
  nextBlock: Block | null;
  pageType: BlockProps["pageType"];
};

export function PreviewBlockList(props: {
  blocks: Block[];
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  return props.blocks.map((b, index, arr) => (
    <VisiblePreviewBlock
      key={b.factID}
      previewRef={props.previewRef}
      pageType="doc"
      previousBlock={arr[index - 1] || null}
      nextBlock={arr[index + 1] || null}
      {...b}
    />
  ));
}

function VisiblePreviewBlock(
  props: PreviewProps & {
    previewRef: React.RefObject<HTMLDivElement | null>;
  },
) {
  let ref = useRef<HTMLDivElement | null>(null);
  let [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    if (!ref.current) return;
    let observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setIsVisible(entry.isIntersecting));
      },
      { threshold: 0.01, root: props.previewRef.current },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [props.previewRef]);
  return <div ref={ref}>{isVisible && <PreviewBlock {...props} />}</div>;
}

export function PreviewBlock(props: PreviewProps) {
  let displayedAsHeading = props.type === "heading";
  let alignment = useEntity(props.entityID, "block/text-alignment")?.data.value;
  let alignmentStyle =
    props.type === "button" || props.type === "image"
      ? "justify-center"
      : "justify-start";
  if (alignment)
    alignmentStyle = {
      left: "justify-start",
      right: "justify-end",
      center: "justify-center",
      justify: "justify-start",
    }[alignment];

  return (
    <div
      className={`
        blockWrapper relative
        flex flex-row gap-2
        px-3 sm:px-4 pt-1

        z-1 w-full
      ${alignmentStyle}
      ${
        !props.nextBlock
          ? "pb-3 sm:pb-4"
          : displayedAsHeading || (props.listData && props.nextBlock?.listData)
            ? "pb-0"
            : "pb-2"
      }
      ${!displayedAsHeading && props.type === "blockquote" && props.previousBlock?.type === "blockquote" ? (!props.listData ? "-mt-3" : "-mt-1") : ""}
      ${
        displayedAsHeading &&
        props.previousBlock &&
        props.previousBlock.type !== "horizontal-rule"
          ? props.previousBlock.type !== "heading"
            ? {
                1: "mt-5 sm:mt-6",
                2: "mt-4 sm:mt-5",
                3: "mt-2 sm:mt-3",
                4: "mt-2 sm:mt-3",
              }[props.headingLevel || 1]
            : "mt-1"
          : ""
      }
      ${
        !props.previousBlock
          ? displayedAsHeading || props.type === "text"
            ? "mt-1 sm:mt-2"
            : "mt-2 sm:mt-3"
          : ""
      }`}
    >
      {props.listData && <PreviewListMarker {...props} />}
      <PreviewBlockContent {...props} />
    </div>
  );
}

function PreviewBlockContent(props: PreviewProps) {
  switch (props.type) {
    case "text":
    case "heading":
    case "blockquote":
      return (
        <RenderedTextBlock
          entityID={props.entityID}
          type={props.type}
          first={props.previousBlock === null}
          pageType={props.pageType}
          previousBlock={props.previousBlock}
          pageID={props.parent}
        />
      );
    case "image":
      return <PreviewImage entityID={props.entityID} />;
    case "horizontal-rule":
      return <hr className="my-4 w-full border-border-light" />;
    case "card":
      return <PreviewPageLink entityID={props.entityID} />;
    default:
      return <PreviewPlaceholder label={props.type.replaceAll("-", " ")} />;
  }
}

function PreviewImage(props: { entityID: string }) {
  let image = useEntity(props.entityID, "block/image");
  if (!image) return <PreviewPlaceholder />;
  return (
    <img
      alt=""
      loading="lazy"
      decoding="async"
      src={image.data.local ? image.data.fallback : image.data.src}
      width={image.data.width}
      height={image.data.height}
      // The thumbhash shows through until the full image decodes.
      style={{
        backgroundImage: `url(${image.data.fallback})`,
        backgroundSize: "cover",
      }}
    />
  );
}

function PreviewPageLink(props: { entityID: string }) {
  let page = useEntity(props.entityID, "block/card");
  let type =
    useEntity(page?.data.value || null, "page/type")?.data.value || "doc";
  let metadata = usePageMetadata(
    type === "doc" ? page?.data.value || null : null,
  );
  if (!page) return null;
  if (type === "canvas")
    return (
      <div className="nonTextBlock block-border bg-page w-full h-[200px]" />
    );
  return (
    <div className="nonTextBlock block-border bg-page w-full p-0! overflow-hidden">
      <div className="my-2 mx-3 text-sm">
        {metadata.map((b) => (
          <div
            key={b.entityID}
            className={b.type === "heading" ? "font-bold" : ""}
          >
            <RenderedTextBlock entityID={b.entityID} type="text" />
          </div>
        ))}
      </div>
    </div>
  );
}

// A final state, not a loading one: previews don't render these block types at
// all. Outlined rather than filled so it can't be read as a stuck skeleton.
function PreviewPlaceholder(props: { label?: string }) {
  return (
    <div className="w-full h-8 rounded-md border border-border-light text-tertiary text-sm flex items-center px-2 capitalize">
      {props.label}
    </div>
  );
}

function PreviewListMarker(props: PreviewProps) {
  let checklist = useEntity(props.entityID, "block/check-list");
  let listStyle = useEntity(props.entityID, "block/list-style");
  let headingLevel = useEntity(props.entityID, "block/heading-level")?.data
    .value;
  let depth = props.listData?.depth;
  return (
    <div
      className={`shrink-0 flex justify-end items-center h-3 z-1
                  ${
                    props.type === "heading"
                      ? headingLevel === 3
                        ? "pt-[12px]"
                        : headingLevel === 2
                          ? "pt-[15px]"
                          : "pt-[20px]"
                      : "pt-[12px]"
                  }`}
      style={{
        width:
          depth &&
          `calc(${depth} * ${`var(--list-marker-width) ${checklist ? " + 20px" : ""} - 6px`} `,
      }}
    >
      <div
        className={`listMarker ${listStyle?.data.value === "ordered" ? "" : "px-3 py-2"}`}
      >
        {listStyle?.data.value === "ordered" ? (
          <div className="text-secondary font-normal text-right w-[2rem]">
            {props.listData?.displayNumber || 1}.
          </div>
        ) : (
          <div className="h-[5px] w-[5px] rounded-full bg-secondary shrink-0 right-0 outline outline-offset-1 outline-transparent" />
        )}
      </div>
      {checklist && (
        <div
          className={`pr-2 ${checklist.data.value ? "text-accent-contrast" : "text-border"}`}
        >
          {checklist.data.value ? <CheckboxChecked /> : <CheckboxEmpty />}
        </div>
      )}
    </div>
  );
}
