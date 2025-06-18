"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { Separator } from "components/Layout";
import { useSmoker } from "components/Toast";
import { useEffect, useState } from "react";
import { useInteractionState } from "./Interactions/Interactions";

export function QuoteHandler() {
  let { drawerOpen: open } = useInteractionState();

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
      let quoteTrigger = document.getElementById("quote-trigger");
      if (quoteTrigger && quoteTrigger.contains(e.target as Node)) {
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

  // getting distance of element from top of scrollheight
  let screenScroll =
    window.document.getElementById("post-page")?.scrollTop || 0;
  let selectionTop = focusRect && focusRect.top + screenScroll;
  let selectionBottom = focusRect && focusRect.bottom + screenScroll;

  let parent = document.getElementById("post-content")?.getBoundingClientRect();
  let parentLeft = parent?.left || 0;

  // getting distance of right side of element from the right edge of screen
  let screenRight =
    window.document.getElementById("post-page")?.getBoundingClientRect()
      .right || 0;
  let parentRight = (parent && screenRight - parent.right) || 0;
  let selectionRight = focusRect && screenRight - focusRect?.right;

  let width = 273;

  // check to see if there is enough space to the left and right of the button so it doesn't spill over the boundry
  let leftBumper = focusRect && focusRect.left - parentLeft < width;
  let rightBumper = selectionRight && selectionRight - parentRight < width;

  if (selectionText && selectionText !== "") {
    return (
      <div
        id="quote-trigger"
        className="accent-container border border-border-light  text-accent-contrast px-1 flex gap-2 text-sm justify-center text-center items-center"
        style={{
          position: "absolute",
          top:
            selectionDir === "forward"
              ? `calc(${selectionBottom}px + 4px )`
              : `calc(${selectionTop}px - 28px )`,
          right:
            selectionDir === "forward" && leftBumper
              ? undefined
              : selectionDir === "forward"
                ? `${selectionRight}px`
                : rightBumper
                  ? `${parentRight}px`
                  : undefined,
          left:
            selectionDir === "forward" && leftBumper
              ? `${parentLeft + 16}px`
              : selectionDir === "forward"
                ? undefined
                : rightBumper
                  ? undefined
                  : `calc(${focusRect?.left}px)`,
        }}
      >
        <QuoteOptionButtons />
      </div>
    );
  }
}

export const QuoteOptionButtons = () => {
  let smoker = useSmoker();

  return (
    <>
      <div className="">Share Quote via</div>

      <button
        className="flex gap-1 items-center hover:font-bold"
        onClick={() => highlightContent()}
      >
        <BlueskyLinkTiny className="shrink-0" />
        Bluesky
      </button>
      <Separator classname="h-3" />
      <button
        id="copy-quote-link"
        className="flex gap-1 items-center  hover:font-bold"
        onClick={() => {
          let rect = document
            .getElementById("copy-quote-link")
            ?.getBoundingClientRect();
          smoker({
            text: <strong>Copied Link</strong>,
            position: {
              y: rect ? rect.top : 0,
              x: rect ? rect.right + 5 : 0,
            },
          });
        }}
      >
        <CopyTiny className="shrink-0" />
        Link
      </button>
    </>
  );
};

function highlightContent() {
  const selection = window.getSelection();

  let span = document.createElement("span");
  span.classList.add("highlight", "rounded-md", "scroll-my-6");
  span.style.backgroundColor = "rgba(var(--accent-contrast), .15)";
  span.onclick = () => {};
  selection?.getRangeAt(0).surroundContents(span);
  useInteractionState.setState({ drawerOpen: true });
}
