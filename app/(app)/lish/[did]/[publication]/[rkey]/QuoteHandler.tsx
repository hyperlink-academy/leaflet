"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { Separator } from "components/Layout";
import { useSmoker } from "components/Toast";
import { useMemo, useState } from "react";
import {
  encodeQuotePosition,
  decodeQuotePosition,
  QuotePosition,
} from "./quotePosition";
import { useIdentityData } from "components/IdentityProvider";
import { CommentTiny } from "components/Icons/CommentTiny";
import { setInteractionState } from "./Interactions/Interactions";
import { useDocument } from "contexts/DocumentContext";
import { flushSync } from "react-dom";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { SelectionActionPopover } from "components/SelectionActionPopover";
import { BskyShareModal } from "components/Interactions/InteractionShareButton";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";

export function QuoteHandler() {
  return (
    <SelectionActionPopover
      id="quote-trigger"
      containerSelector=".postContent"
      resolve={({ range }) => {
        let startIndex = findDataIndex(range.startContainer);
        let endIndex = findDataIndex(range.endContainer);
        if (!startIndex || !endIndex) return null;
        let startOffset = calculateOffsetFromDataParent(
          range.startContainer,
          range.startOffset,
          startIndex.element,
        );
        let endOffset = calculateOffsetFromDataParent(
          range.endContainer,
          range.endOffset,
          endIndex.element,
        );
        let position: QuotePosition = {
          ...(startIndex.pageId && { pageId: startIndex.pageId }),
          start: {
            block: startIndex.index.split(".").map((i) => parseInt(i)),
            offset: startOffset,
          },
          end: {
            block: endIndex.index.split(".").map((i) => parseInt(i)),
            offset: endOffset,
          },
        };
        return encodeQuotePosition(position);
      }}
    >
      {(position) => <QuoteOptionButtons position={position} />}
    </SelectionActionPopover>
  );
}

const QuoteOptionButtons = (props: { position: string }) => {
  let smoker = useSmoker();
  let { identity } = useIdentityData();
  const { uri: document_uri, publication } = useDocument();
  let [shareModalOpen, setShareModalOpen] = useState(false);
  let [url, position] = useMemo(() => {
    let currentUrl = new URL(window.location.href);
    let pos = decodeQuotePosition(props.position);
    if (currentUrl.pathname.includes("/l-quote/")) {
      currentUrl.pathname = currentUrl.pathname.split("/l-quote/")[0];
    }
    currentUrl.pathname = currentUrl.pathname + `/l-quote/${props.position}`;

    // Clear existing query parameters
    currentUrl.search = "";

    const fragmentId = pos?.pageId
      ? `${pos.pageId}~${pos.start.block.join(".")}_${pos.start.offset}`
      : `${pos?.start.block.join(".")}_${pos?.start.offset}`;
    currentUrl.hash = `#${fragmentId}`;
    return [currentUrl.toString(), pos];
  }, [props.position]);
  let pubRecord = publication?.record;

  return (
    <>
      <div className="">Share via</div>

      <button
        className="flex relative gap-1 items-center hover:font-bold px-1 hover:no-underline!"
        onClick={() => setShareModalOpen(true)}
      >
        <BlueskyTiny className="shrink-0" />
        Bluesky
      </button>
      <BskyShareModal
        postUrl={`https://bsky.app/intent/compose?text=${encodeURIComponent(url)}`}
        onPosted={() => setShareModalOpen(false)}
        shareModalOpen={shareModalOpen}
        setShareModalOpen={setShareModalOpen}
      />
      <Separator classname="h-4!" />
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
          <Separator classname="h-4! " />

          <button
            className="flex gap-1 items-center hover:font-bold px-1"
            onClick={() => {
              if (!position) return;
              flushSync(() =>
                setInteractionState(document_uri, {
                  drawer: "comments",
                  drawerOpen: true,
                  pageId: position.pageId,
                  commentBox: { quote: position },
                }),
              );
              scrollIntoView("interaction-drawer");
            }}
          >
            <CommentTiny /> Comment
          </button>
        </>
      )}
    </>
  );
};

function findDataIndex(
  node: Node,
): { index: string; element: Element; pageId?: string } | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    if (element.hasAttribute("data-index")) {
      const index = element.getAttribute("data-index");
      if (index) {
        const pageId = element.getAttribute("data-page-id") || undefined;
        return { index, element, pageId };
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
