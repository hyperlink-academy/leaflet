"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { useSmoker } from "components/Toast";
import { index } from "drizzle-orm/sqlite-core";
import { ElementType, useEffect, useState } from "react";

export function QuoteHandler() {
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

  let parentScroll = document.getElementById("post-content")?.scrollTop || 0;
  let parentLeft =
    document.getElementById("post-content")?.getBoundingClientRect().left || 0;
  let parentRight =
    document.getElementById("post-content")?.getBoundingClientRect().right || 0;
  let relativeTop = focusRect && focusRect.top + parentScroll;
  let relativeBottom = focusRect && focusRect.bottom + parentScroll;
  let relativeLeft = focusRect && focusRect.left - parentLeft;
  let relativeRight = focusRect && parentRight - focusRect.right;

  // check to see if there is enough space to the left and right of the button so it doesn't spill over the boundry
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
        <QuoteOptionButtons />
      </div>
    );
  }
}

export const QuoteOptionButtons = () => {
  let smoker = useSmoker();

  return (
    <>
      <div className="text-tertiary">Quote via</div>

      <button
        className="flex gap-1 items-center text-secondary hover:text-accent-contrast"
        onClick={() => highlightContent()}
      >
        <BlueskyLinkTiny className="shrink-0" />
        Bluesky
      </button>
      <Separator classname="h-3" />
      <button
        id="copy-quote-link"
        className="flex gap-1 items-center text-secondary hover:text-accent-contrast"
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

// messing around with different styling quotes here, to put an icon next to the quote
// export const Quotes = () => {
//   let parentScroll = document.getElementById("post-content")?.scrollTop || 0;

//   let [quotes, setQuotes] = useState<Element[]>([]);

//   useEffect(() => {
//     function updateQuotes() {
//       setQuotes(
//         Array.from(window.document.getElementsByClassName("highlight")),
//       );
//     }
//     updateQuotes();
//     const observer = new MutationObserver(() => {
//       updateQuotes();
//     });

//     observer.observe(document.body, {
//       childList: true, // Watch for added/removed child nodes
//       subtree: true, // Watch the entire subtree
//     });

//     return () => {
//       observer.disconnect();
//     };
//   }, []);

//   useEffect(() => {
//     setQuotes(quotes);
//   }, [quotes]);

//   return quotes.map((q, index) => {
//     let quoteTop = q.getBoundingClientRect().top;
//     let relativeTop = quoteTop + parentScroll;
//     return (
//       <div
//         className="bg-test w-[4px] "
//         style={{
//           position: "absolute",
//           top: relativeTop,
//           left: "4px",
//           height: `${q.getBoundingClientRect().height}px`,
//         }}
//         key={index}
//       ></div>
//     );
//   });
// };

function highlightContent() {
  const selection = window.getSelection();
  let span = document.createElement("span");
  span.classList.add("highlight", "rounded-md", "scroll-my-6");
  span.style.backgroundColor = "rgba(var(--accent-contrast), .15)";
  span.onclick = () => {};

  selection?.getRangeAt(0).surroundContents(span);
}
