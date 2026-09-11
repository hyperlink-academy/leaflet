import { useEntity } from "src/replicache";
import { RenderYJSFragment } from "./RenderYJSFragment";
import type { BlockProps } from "../Block";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useFootnotePopoverStore } from "components/Footnotes/footnotePopoverStore";
import { blockTextSize } from "src/utils/blockTextSize";

export const HeadingStyle = {
  1: "font-bold leading-tight pb-1 [font-family:var(--theme-heading-font)]",
  2: "font-bold leading-tight pb-1 [font-family:var(--theme-heading-font)]",
  3: "font-bold leading-tight pb-1 [font-family:var(--theme-heading-font)]",
  4: "font-bold leading-snug pb-1 text-secondary [font-family:var(--theme-heading-font)]",
} as { [level: number]: string };

export const headingFontSize = {
  1: blockTextSize.h1,
  2: blockTextSize.h2,
  3: blockTextSize.h3,
  4: blockTextSize.h4,
} as { [level: number]: string };

export function RenderedTextBlock(props: {
  entityID: string;
  className?: string;
  first?: boolean;
  pageType?: "canvas" | "doc";
  type: BlockProps["type"];
  previousBlock?: BlockProps["previousBlock"];
  pageID?: string;
}) {
  let initialFact = useEntity(props.entityID, "block/text");
  let storedHeadingLevel = useEntity(props.entityID, "block/heading-level");
  let headingLevel =
    props.type === "heading" ? storedHeadingLevel?.data.value || 1 : undefined;
  let textSize = useEntity(props.entityID, "block/text-size");
  let alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value || "left";
  let alignmentClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
    justify: "text-justify",
  }[alignment];
  let textStyle =
    textSize?.data.value === "small"
      ? "textSizeSmall"
      : textSize?.data.value === "large"
        ? "textSizeLarge"
        : "";
  let { permissions } = useEntitySetContext();

  let content = <br />;
  if (!initialFact) {
    if (permissions.write && (props.first || props.pageType === "canvas"))
      content = (
        <div
          className={`${props.className}
            pointer-events-none italic text-tertiary flex flex-col `}
        >
          {headingLevel === 1
            ? "Title"
            : headingLevel === 2
              ? "Header"
              : headingLevel === 3
                ? "Subheader"
                : "write something…"}
          <div className=" text-xs font-normal">
            or type &quot;/&quot; for commands
          </div>
        </div>
      );
  } else {
    content = (
      <RenderYJSFragment
        value={initialFact.data.value}
        wrapper="p"
        renderComments={permissions.write}
      />
    );
  }
  return (
    <div
      style={{
        wordBreak: "break-word",
        ...(headingLevel ? { fontSize: headingFontSize[headingLevel] } : {}),
      }}
      onClick={(e) => {
        let target = e.target as HTMLElement;
        let footnoteRef = target.closest(".footnote-ref") as HTMLElement | null;
        if (!footnoteRef) return;
        let footnoteID = footnoteRef.dataset.footnoteId;
        if (!footnoteID) return;
        let store = useFootnotePopoverStore.getState();
        if (store.activeFootnoteID === footnoteID) {
          store.close();
        } else {
          store.open(footnoteID, footnoteRef, props.pageID);
        }
      }}
      className={`
        ${alignmentClass}
        ${props.type === "blockquote" && !headingLevel ? (props.previousBlock?.type === "blockquote" ? `blockquote pt-3 ` : "blockquote") : ""}
        ${headingLevel ? HeadingStyle[headingLevel] : textStyle}
      w-full whitespace-pre-wrap outline-hidden ${props.className} `}
    >
      {content}
    </div>
  );
}
