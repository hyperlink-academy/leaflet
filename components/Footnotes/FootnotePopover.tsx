"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { create } from "zustand";
import { useFootnoteContext } from "./FootnoteContext";
import { FootnoteEditor } from "./FootnoteEditor";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { deleteFootnoteFromBlock } from "./deleteFootnoteFromBlock";

type FootnotePopoverState = {
  activeFootnoteID: string | null;
  anchorElement: HTMLElement | null;
  open: (footnoteID: string, anchor: HTMLElement) => void;
  close: () => void;
};

export const useFootnotePopoverStore = create<FootnotePopoverState>((set) => ({
  activeFootnoteID: null,
  anchorElement: null,
  open: (footnoteID, anchor) =>
    set({ activeFootnoteID: footnoteID, anchorElement: anchor }),
  close: () => set({ activeFootnoteID: null, anchorElement: null }),
}));

export function FootnotePopover() {
  let { activeFootnoteID, anchorElement, close } = useFootnotePopoverStore();
  let { footnotes } = useFootnoteContext();
  let { permissions } = useEntitySetContext();
  let rep = useReplicache();
  let popoverRef = useRef<HTMLDivElement>(null);
  let [position, setPosition] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
  } | null>(null);

  let footnote = footnotes.find(
    (fn) => fn.footnoteEntityID === activeFootnoteID,
  );

  // Compute the displayed index from DOM order (matching CSS counters)
  // rather than the data model order, which may differ if footnotes
  // were inserted out of order within a block.
  let displayIndex = useMemo(() => {
    if (!anchorElement || !footnote) return footnote?.index ?? 0;
    let container = anchorElement.closest('.footnote-scope');
    if (!container) return footnote.index;
    let allRefs = Array.from(container.querySelectorAll(".footnote-ref"));
    let pos = allRefs.indexOf(anchorElement);
    return pos >= 0 ? pos + 1 : footnote.index;
  }, [anchorElement, footnote]);

  let updatePosition = useCallback(() => {
    if (!anchorElement || !popoverRef.current) return;

    let anchorRect = anchorElement.getBoundingClientRect();
    let popoverWidth = popoverRef.current.offsetWidth;
    let popoverHeight = popoverRef.current.offsetHeight;

    // Position above the anchor by default, fall back to below
    let top = anchorRect.top - popoverHeight - 8;
    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;

    // Clamp horizontal position
    let padding = 12;
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - popoverWidth - padding),
    );

    // Arrow position relative to popover
    let arrowLeft = anchorRect.left + anchorRect.width / 2 - left;

    // If not enough room above, show below
    if (top < padding) {
      top = anchorRect.bottom + 8;
    }

    setPosition({ top, left, arrowLeft });
  }, [anchorElement]);

  useEffect(() => {
    if (!activeFootnoteID || !anchorElement) {
      setPosition(null);
      return;
    }

    // Delay to let the popover render so we can measure it
    requestAnimationFrame(updatePosition);

    let handleClickOutside = (e: Event) => {
      let target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        !anchorElement.contains(target)
      ) {
        close();
      }
    };

    let handleScroll = () => close();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    // Close on scroll of any scroll container
    let scrollWrapper = anchorElement.closest(".pageScrollWrapper");
    scrollWrapper?.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", close);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      scrollWrapper?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", close);
    };
  }, [activeFootnoteID, anchorElement, close, updatePosition]);

  if (!activeFootnoteID || !footnote) return null;

  return (
    <div
      ref={popoverRef}
      className="footnote-popover fixed z-50 bg-bg-page border border-border rounded-lg shadow-md px-3 py-2 w-[min(calc(100vw-24px),320px)]"
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <FootnoteEditor
        footnoteEntityID={footnote.footnoteEntityID}
        index={displayIndex}
        editable={permissions.write}
        autoFocus={permissions.write}
        onDelete={
          permissions.write
            ? () => {
                deleteFootnoteFromBlock(
                  footnote.footnoteEntityID,
                  footnote.blockID,
                  rep.rep,
                );
                close();
              }
            : undefined
        }
      />
    </div>
  );
}
