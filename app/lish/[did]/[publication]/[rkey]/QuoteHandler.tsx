"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { Menu, MenuItem, Separator } from "components/Layout";
import { Popover } from "components/Popover";
import { useSmoker } from "components/Toast";
import { useEffect, useState } from "react";

export function QuoteHandler() {
  let [isBskyUser, setIsBskyUser] = useState(true);
  let [selectionText, setSelectionText] = useState<string | undefined>(
    undefined,
  );
  let [focusRect, setFocusRect] = useState<DOMRect | null>(null);

  let [selectionDir, setSelectionDir] = useState<
    "forward" | "backward" | "none" | null
  >(null);

  useEffect(() => {
    const selection = window.getSelection();

    const handleMouseUp = (e: MouseEvent) => {
      const focusNode = selection?.focusNode;
      const focusOffset = selection?.focusOffset;
      const selectionText = selection?.toString();
      const quoteRect = selection?.getRangeAt(0).getBoundingClientRect();

      setSelectionText(selectionText);

      let focusRect;
      if (focusNode?.nodeType === Node.TEXT_NODE && focusOffset !== undefined) {
        const range = document.createRange();
        range.setStart(focusNode, focusOffset);
        range.setEnd(focusNode, focusOffset);

        focusRect = range.getBoundingClientRect();
        setFocusRect(focusRect);
      } else if (focusNode?.nodeType === Node.ELEMENT_NODE) {
        focusRect = (e?.target as HTMLElement).getBoundingClientRect();
        setFocusRect(focusRect);
      }

      quoteRect &&
        focusRect &&
        setSelectionDir(
          quoteRect.top < focusRect.top
            ? "forward"
            : quoteRect.top === focusRect.top &&
                quoteRect.right === focusRect.right
              ? "forward"
              : "backward",
        );
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target === document.getElementById("quote-trigger")) {
        return;
      }

      setFocusRect(null);
      setSelectionDir(null);
      setSelectionText(undefined);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  let parentScroll = document.getElementById("post-content")?.scrollTop || 0;
  let parentLeft =
    document.getElementById("post-content")?.getBoundingClientRect().left || 0;
  let parentRight =
    document.getElementById("post-content")?.getBoundingClientRect().right || 0;
  let relativeTop = focusRect && focusRect.top + parentScroll;
  let relativeLeft = focusRect && focusRect.left - parentLeft;
  let relativeRight = focusRect && parentRight - focusRect.right;

  let relativeBottom = focusRect && focusRect.bottom + parentScroll;

  // check to see if there is enough space to the left of the button so it doesn't spill over the boundry
  let leftBumper = focusRect && focusRect.left - parentLeft < 226;
  let rightBumper = focusRect && parentRight - focusRect.right < 226;

  if (selectionText && selectionText !== "") {
    return (
      <div
        id="quote-trigger"
        className="opaque-container px-1 flex gap-2 text-sm justify-center text-center items-center"
        style={{
          position: "absolute",
          top:
            selectionDir === "forward"
              ? `calc(${relativeBottom}px + 4px )`
              : `calc(${relativeTop}px - 28px )`,
          right:
            selectionDir === "forward" && leftBumper
              ? undefined
              : selectionDir === "forward"
                ? `calc(${relativeRight}px) `
                : rightBumper
                  ? "16px"
                  : undefined,
          left:
            selectionDir === "forward" && leftBumper
              ? "16px"
              : selectionDir === "forward"
                ? undefined
                : rightBumper
                  ? undefined
                  : `calc(${relativeLeft}px)`,
        }}
      >
        <div className="text-tertiary">Quote via</div>
        <button className="flex gap-1 items-center text-secondary hover:text-accent-contrast">
          <BlueskyLinkTiny className="shrink-0" />
          Bluesky
        </button>
        <Separator classname="h-3" />

        <button className="flex gap-1 items-center text-secondary hover:text-accent-contrast">
          <CopyTiny className="shrink-0" />
          Link
        </button>
      </div>
      // <Menu
      //   asChild
      //   trigger={
      //     <button
      //       id="quote-trigger"
      //       style={{
      //         position: "absolute",
      //         top:
      //           selectionDir === "forward"
      //             ? `calc(${relativeBottom}px + 8px )`
      //             : `calc(${relativeTop}px - 32px )`,
      //         left:
      //           selectionDir === "forward" && leftBumper
      //             ? `calc(${relativeLeft}px - 24px) `
      //             : selectionDir === "forward"
      //               ? `16px `
      //               : `calc(${relativeLeft}px)`,
      //       }}
      //       className={`
      //   quoteTrigger
      //   w-8 h-8 rounded-full bg-test`}
      //     />
      //   }
      // >
      //   <MenuItem onSelect={() => {}}>
      //     <div>Copy Link to Quote</div>
      //   </MenuItem>
      //   <MenuItem onSelect={() => {}}>
      //     <div>Share Quote on Bluesky</div>
      //   </MenuItem>
      // </Menu>
    );
  }
}
