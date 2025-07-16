"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { Separator } from "components/Layout";
import { useSmoker } from "components/Toast";
import { useEffect, useMemo, useState } from "react";
import { useInteractionState } from "./Interactions/Interactions";
import { encodeQuotePosition, QUOTE_PARAM } from "./useHighlight";

export function QuoteHandler() {
  let [selectionText, setSelectionText] = useState<string | undefined>(
    undefined,
  );
  let [focusRect, setFocusRect] = useState<DOMRect | null>(null);
  let [selectionDir, setSelectionDir] = useState<
    "forward" | "backward" | "none" | null
  >(null);

  useEffect(() => {
    const handleSelectionChange = (e: Event) => {
      const selection = document.getSelection();
      const postContent = document.getElementById("post-content");
      const isWithinPostContent =
        postContent && selection?.rangeCount && selection.rangeCount > 0
          ? postContent.contains(
              selection.getRangeAt(0).commonAncestorContainer,
            )
          : false;

      if (!selection || !isWithinPostContent) {
        setFocusRect(null);
        setSelectionDir(null);
        setSelectionText(undefined);
        return;
      }
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
        focusRect = (e?.target as HTMLElement)?.getBoundingClientRect();
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

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);
  let smoker = useSmoker();

  // Memoize calculations to avoid server-side rendering issues
  const {
    selectionTop,
    selectionBottom,
    parentLeft,
    parentRight,
    selectionRight,
    leftBumper,
    rightBumper,
  } = useMemo(() => {
    if (typeof window === "undefined" || !focusRect) {
      return {
        screenScroll: 0,
        selectionTop: null,
        selectionBottom: null,
        parentLeft: 0,
        screenRight: 0,
        parentRight: 0,
        selectionRight: null,
        width: 273,
        leftBumper: false,
        rightBumper: false,
      };
    }

    const screenScroll =
      window.document.getElementById("post-page")?.scrollTop || 0;
    const selectionTop = focusRect.top + screenScroll;
    const selectionBottom = focusRect.bottom + screenScroll;

    const parent = document
      .getElementById("post-content")
      ?.getBoundingClientRect();
    const parentLeft = parent?.left || 0;

    const screenRight =
      window.document.getElementById("post-page")?.getBoundingClientRect()
        .right || 0;
    const parentRight = (parent && screenRight - parent.right) || 0;
    const selectionRight = screenRight - focusRect.right;

    const width = 273;

    const leftBumper = focusRect.left - parentLeft < width;
    const rightBumper = selectionRight - parentRight < width;

    return {
      selectionTop,
      selectionBottom,
      parentLeft,
      parentRight,
      selectionRight,
      leftBumper,
      rightBumper,
    };
  }, [focusRect]);

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
  const getURL = () => {
    let selection = document.getSelection()?.getRangeAt(0);
    if (!selection) return;
    let startIndex = findDataIndex(selection.startContainer);
    let startOffset = selection.startOffset;
    let endIndex = findDataIndex(selection.endContainer);
    let endOffset = selection.endOffset;
    if (!startIndex || !endIndex) return;
    console.log(startIndex, endIndex);
    let quotePosition = encodeQuotePosition({
      start: {
        block: startIndex.split(".").map((i) => parseInt(i)),
        offset: startOffset,
      },
      end: {
        block: endIndex.split(".").map((i) => parseInt(i)),
        offset: endOffset,
      },
    });
    let currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set(QUOTE_PARAM, quotePosition);
    currentUrl.hash = `#${startIndex}`;
    return currentUrl.toString();
  };

  return (
    <>
      <div className="">Share Quote via</div>

      <button
        className="flex gap-1 items-center hover:font-bold"
        role="link"
        onClick={() => {
          let url = getURL();
          if (!url) return;
          window.open(
            `https://bsky.app/intent/compose?text=${encodeURIComponent(url.toString())}`,
            "_blank",
          );
        }}
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
          let url = getURL();
          if (!url) return;
          navigator.clipboard.writeText(url.toString());

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

function findDataIndex(node: Node): string | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    if (element.hasAttribute("data-index")) {
      return element.getAttribute("data-index");
    }
  }

  if (node.parentNode) {
    return findDataIndex(node.parentNode);
  }

  return null;
}

function highlightContent() {
  let span = document.createElement("span");
  span.classList.add("highlight", "rounded-md", "scroll-my-6");
  span.style.backgroundColor = "rgba(var(--accent-contrast), .15)";
  span.onclick = () => {};
  const selection = document.getSelection();
  selection?.getRangeAt(0).surroundContents(span);
  useInteractionState.setState({ drawerOpen: true });
}
