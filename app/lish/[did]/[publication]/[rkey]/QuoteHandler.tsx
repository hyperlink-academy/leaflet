"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { Separator } from "components/Layout";
import { useSmoker } from "components/Toast";
import { useEffect, useMemo, useState, useContext } from "react";
import {
  encodeQuotePosition,
  decodeQuotePosition,
  QuotePosition,
} from "./quotePosition";
import { useIdentityData } from "components/IdentityProvider";
import { CommentTiny } from "components/Icons/CommentTiny";
import { setInteractionState } from "./Interactions/Interactions";
import { PostPageContext } from "./PostPageContext";
import { PubLeafletPublication } from "lexicons/api";

export function QuoteHandler() {
  let [position, setPosition] = useState<{
    top: number;
    left: number;
    position: string;
  } | null>(null);
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

      let selectionTop = quoteRect.top;
      let selectionLeft = quoteRect.left;
      if (selection?.focusNode && selection?.focusOffset) {
        const range = document.createRange();
        range.setStart(selection?.focusNode, selection?.focusOffset);
        range.setEnd(selection?.focusNode, selection?.focusOffset);

        let endCursorRect = range.getBoundingClientRect();
        selectionLeft = endCursorRect.left - 128;
      }

      let dir = selection.direction;
      const range = selection.getRangeAt(0);
      if (!dir) {
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

      if (selection.direction === "backward") {
        selectionTop -= 28;
      } else {
        // forward
        selectionTop += quoteRect.height + 8;
      }

      let startIndex = findDataIndex(range.startContainer);
      let endIndex = findDataIndex(range.endContainer);
      if (!startIndex || !endIndex) return;
      let startOffset = calculateOffsetFromDataParent(
        range.startContainer,
        range.startOffset,
        startIndex?.element,
      );
      let endOffset = calculateOffsetFromDataParent(
        range.endContainer,
        range.endOffset,
        endIndex?.element,
      );
      let position: QuotePosition = {
        start: {
          block: startIndex?.index.split(".").map((i) => parseInt(i)),
          offset: startOffset,
        },
        end: {
          block: endIndex.index.split(".").map((i) => parseInt(i)),
          offset: endOffset,
        },
      };
      setPosition({
        top: selectionTop,
        left: selectionLeft,
        position: encodeQuotePosition(position),
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
        className={`accent-container border border-border-light text-accent-contrast px-1 flex gap-1 text-sm justify-center text-center items-center`}
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
        }}
      >
        <QuoteOptionButtons position={position.position} />
      </div>
    );
  }
}

export const QuoteOptionButtons = (props: { position: string }) => {
  let smoker = useSmoker();
  let { identity } = useIdentityData();
  const data = useContext(PostPageContext);
  const document_uri = data?.uri;
  if (!document_uri)
    throw new Error("document_uri not available in PostPageContext");
  let [url, position] = useMemo(() => {
    let currentUrl = new URL(window.location.href);
    let pos = decodeQuotePosition(props.position);
    if (currentUrl.pathname.includes("/l-quote/")) {
      currentUrl.pathname = currentUrl.pathname.split("/l-quote/")[0];
    }
    currentUrl.pathname = currentUrl.pathname + `/l-quote/${props.position}`;

    // Clear existing query parameters
    currentUrl.search = "";

    currentUrl.hash = `#${pos?.start.block.join(".")}_${pos?.start.offset}`;
    return [currentUrl.toString(), pos];
  }, [props.position]);
  let pubRecord = data.documents_in_publications[0]?.publications?.record as
    | PubLeafletPublication.Record
    | undefined;

  return (
    <>
      <div className="">Share via</div>

      <a
        className="flex gap-1 items-center hover:font-bold px-1 hover:no-underline!"
        role="link"
        href={`https://bsky.app/intent/compose?text=${encodeURIComponent(url)}`}
        target="_blank"
      >
        <BlueskyLinkTiny className="shrink-0" />
        Bluesky
      </a>
      <Separator classname="h-4" />
      <button
        id="copy-quote-link"
        className="flex gap-1 items-center hover:font-bold px-1"
        onClick={() => {
          let rect = document
            .getElementById("copy-quote-link")
            ?.getBoundingClientRect();
          if (!url) return;
          navigator.clipboard.writeText(url);

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
      {pubRecord?.preferences?.showComments !== false && identity?.atp_did && (
        <>
          <Separator classname="h-4" />
          <button
            className="flex gap-1 items-center hover:font-bold px-1"
            onClick={() => {
              if (!position) return;
              setInteractionState(document_uri, {
                drawer: "comments",
                drawerOpen: true,
                commentBox: { quote: position },
              });
            }}
          >
            <CommentTiny /> Comment
          </button>
        </>
      )}
    </>
  );
};

function findDataIndex(node: Node): { index: string; element: Element } | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    if (element.hasAttribute("data-index")) {
      const index = element.getAttribute("data-index");
      if (index) {
        return { index, element };
      }
    }
  }

  if (node.parentNode) {
    return findDataIndex(node.parentNode);
  }

  return null;
}

function calculateOffsetFromDataParent(
  selectionNode: Node,
  selectionOffset: number,
  dataParentElement: Element,
): number {
  // If the selection is directly in the data parent, return the offset as-is
  if (selectionNode === dataParentElement) {
    return selectionOffset;
  }

  // Create a range from the start of the data parent to the selection point
  const range = document.createRange();
  range.setStart(dataParentElement, 0);
  range.setEnd(selectionNode, selectionOffset);

  // Get the text content of this range, which gives us the offset from the data parent
  return range.toString().length;
}
