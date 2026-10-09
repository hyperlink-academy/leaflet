// Vertical spacing between blocks, shared by the editor and the published
// renderer so a post lays out exactly as it was written. Blocks are spaced by
// margins that collapse between siblings (a paragraph's mb-2 absorbs the next
// block's mt-1), and min-h-7 gives a single line its 28px row.
export type SpacingKind =
  | "heading"
  | "blockquote"
  | "horizontal-rule"
  | "list"
  | "other";

const headingTop: Record<number, string> = {
  1: "mt-5 sm:mt-6",
  2: "mt-4 sm:mt-5",
  3: "mt-2 sm:mt-3",
};

export function blockSpacingClassName(block: {
  kind: SpacingKind;
  headingLevel?: number;
  previous?: SpacingKind;
  isFirst: boolean;
  isLast: boolean;
  isListItem?: boolean;
}) {
  let top: string;
  let bottom = block.isLast
    ? "mb-3 sm:mb-4"
    : block.kind === "heading"
      ? "mb-0!"
      : "mb-2";
  if (block.kind === "heading") {
    top = block.isFirst
      ? "mt-1 sm:mt-2"
      : block.previous === "horizontal-rule"
        ? ""
        : block.previous === "heading"
          ? "mt-1"
          : (headingTop[block.headingLevel ?? 1] ?? "mt-2 sm:mt-3");
  } else if (block.kind === "blockquote") {
    // Consecutive quotes overlap their margins so the left rule runs
    // unbroken; each renderer pads the quote back down by the same amount.
    top = block.previous === "blockquote" ? "-mt-3!" : "mt-1!";
    bottom = "mb-2!";
  } else {
    top = block.isFirst ? "mt-0" : "mt-1";
  }
  if (block.isListItem) {
    bottom = "mb-0!";
    // A list item's quote has no padding to overlap, so it only closes the
    // 4px row gap.
    if (block.kind === "blockquote" && block.previous === "blockquote")
      top = "-mt-1!";
  }
  return `min-h-7 ${top} ${bottom}`;
}

// A canvas block has no page around it: its content starts and ends at its
// first and last lines, and its height sets the rotation origin.
export const canvasBlockEdges =
  "[&>*:first-child]:mt-0! [&>*:last-child]:mb-0! [&>*:last-child:not(ul,ol,.isListItem)]:min-h-6!";
