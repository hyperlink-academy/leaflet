"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { Separator } from "components/Layout";
import { useSmoker } from "components/Toast";
import { useEffect, useMemo, useState } from "react";
import { useInteractionState } from "./Interactions/Interactions";
import { encodeQuotePosition, QUOTE_PARAM } from "./useHighlight";

export function QuoteHandler() {
  let [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
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

      if (!selection || !isWithinPostContent || !selection?.toString())
        return setPosition(null);
      const quoteRect = selection?.getRangeAt(0).getBoundingClientRect();
      if (!quoteRect) return setPosition(null);

      const screenScroll =
        window.document.getElementById("post-page")?.scrollTop || 0;
      let selectionTop = quoteRect.top + screenScroll;
      let selectionLeft = quoteRect.left;
      if (selection?.focusNode && selection?.focusOffset) {
        const range = document.createRange();
        range.setStart(selection?.focusNode, selection?.focusOffset);
        range.setEnd(selection?.focusNode, selection?.focusOffset);

        let endCursorRect = range.getBoundingClientRect();
        selectionLeft = endCursorRect.left - 128;
      }

      let dir = selection.direction;
      if (!dir) {
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;

        if (startContainer === endContainer) {
          dir = startOffset <= endOffset ? "forward" : "backward";
        } else {
          const position = startContainer.compareDocumentPosition(endContainer);
          dir =
            (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
              ? "forward"
              : "backward";
        }
      }
      if (selection.direction === "forward") {
        selectionTop += quoteRect.height + 8;
      } else if (selection?.direction === "backward") {
        selectionTop -= 28;
      } else {
      }

      setPosition({
        top: selectionTop,
        left: selectionLeft,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  if (position) {
    return (
      <div
        id="quote-trigger"
        className={`accent-container border border-border-light  text-accent-contrast px-1 flex gap-2 text-sm justify-center text-center items-center`}
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
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
