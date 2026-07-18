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
  const {
    uri: document_uri,
    publication,
    normalizedDocument,
    normalizedPublication,
    postUrl,
  } = useDocument();
  // Clicking inside the modal clears the text selection, which unmounts the
  // quote share popover (and the modal), so the modal must live above it.
  let [shareUrl, setShareUrl] = useState<string | null>(null);

  return (
    <>
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
        {(position) => (
          <QuoteOptionButtons
            position={position}
            onShare={setShareUrl}
            postUrl={postUrl}
          />
        )}
      </SelectionActionPopover>
      <BskyShareModal
        pubOwnerDid={publication?.identity_did}
        docRecord={normalizedDocument}
        postUrl={shareUrl ? shareUrl : undefined}
        documentUri={document_uri}
        pubUri={publication?.uri}
        publication={normalizedPublication || undefined}
        preferUrlScreenshot
        onPosted={() => setShareUrl(null)}
        shareModalOpen={shareUrl !== null}
        setShareModalOpen={(open) => {
          if (!open) setShareUrl(null);
        }}
      />
    </>
  );
}

const QuoteOptionButtons = (props: {
  position: string;
  onShare: (url: string) => void;
  postUrl: string;
}) => {
  let smoker = useSmoker();
  let { identity } = useIdentityData();
  const { uri: document_uri, publication } = useDocument();
  let [url, position] = useMemo(() => {
    let postUrl = new URL(props.postUrl, window.location.origin);
    let pos = decodeQuotePosition(props.position);
    if (postUrl.pathname.includes("/l-quote/")) {
      postUrl.pathname = postUrl.pathname.split("/l-quote/")[0];
    }
    postUrl.pathname = postUrl.pathname + `/l-quote/${props.position}`;

    // Clear existing query parameters
    postUrl.search = "";

    const fragmentId = pos?.pageId
      ? `${pos.pageId}~${pos.start.block.join(".")}_${pos.start.offset}`
      : `${pos?.start.block.join(".")}_${pos?.start.offset}`;
    postUrl.hash = `#${fragmentId}`;
    return [postUrl.toString(), pos];
  }, [props.position]);
  let pubRecord = publication?.record;

  return (
    <>
      <div className="">Share via</div>

      <button
        className="flex relative gap-1 items-center hover:font-bold px-1 hover:no-underline!"
        onClick={() => url && props.onShare(url)}
      >
        <BlueskyTiny className="shrink-0" />
        Bluesky
      </button>
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
