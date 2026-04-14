"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { create } from "zustand";
import { TextBlockCore } from "../Blocks/TextBlockCore";
import { PubLeafletRichtextFacet } from "lexicons/api";

type PublishedFootnoteData = {
  footnoteId: string;
  index: number;
  contentPlaintext: string;
  contentFacets?: PubLeafletRichtextFacet.Main[];
};

type PopoverState = {
  activeFootnoteId: string | null;
  anchorElement: HTMLElement | null;
  open: (footnoteId: string, anchor: HTMLElement) => void;
  close: () => void;
};

export const usePublishedFootnotePopoverStore = create<PopoverState>(
  (set) => ({
    activeFootnoteId: null,
    anchorElement: null,
    open: (footnoteId, anchor) =>
      set({ activeFootnoteId: footnoteId, anchorElement: anchor }),
    close: () => set({ activeFootnoteId: null, anchorElement: null }),
  }),
);

export function PublishedFootnoteRefRenderer(props: {
  footnoteId: string;
  index: number;
  children: ReactNode;
}) {
  let ref = useRef<HTMLElement>(null);
  return (
    <sup
      ref={ref}
      className="footnote-ref-tap text-accent-contrast cursor-pointer"
      id={`fnref-${props.footnoteId}`}
      onClick={(e) => {
        e.preventDefault();
        let store = usePublishedFootnotePopoverStore.getState();
        if (store.activeFootnoteId === props.footnoteId) {
          store.close();
        } else {
          store.open(props.footnoteId, e.currentTarget);
        }
      }}
    >
      {props.index}
    </sup>
  );
}

export function PublishedFootnotePopover(props: {
  footnotes: PublishedFootnoteData[];
}) {
  let { activeFootnoteId, anchorElement, close } =
    usePublishedFootnotePopoverStore();
  let popoverRef = useRef<HTMLDivElement>(null);
  let [position, setPosition] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
  } | null>(null);

  let footnote = props.footnotes.find(
    (fn) => fn.footnoteId === activeFootnoteId,
  );

  let updatePosition = useCallback(() => {
    if (!anchorElement || !popoverRef.current) return;

    let anchorRect = anchorElement.getBoundingClientRect();
    let popoverWidth = popoverRef.current.offsetWidth;
    let popoverHeight = popoverRef.current.offsetHeight;

    let top = anchorRect.top - popoverHeight - 8;
    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;

    let padding = 12;
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - popoverWidth - padding),
    );

    let arrowLeft = anchorRect.left + anchorRect.width / 2 - left;

    if (top < padding) {
      top = anchorRect.bottom + 8;
    }

    setPosition({ top, left, arrowLeft });
  }, [anchorElement]);

  useEffect(() => {
    if (!activeFootnoteId || !anchorElement) {
      setPosition(null);
      return;
    }

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
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [activeFootnoteId, anchorElement, close, updatePosition]);

  if (!activeFootnoteId || !footnote) return null;

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
      <div className="flex gap-2 items-start text-sm">
        <span className="text-accent-contrast font-bold shrink-0">
          {footnote.index}
        </span>
        <div className="min-w-0">
          {footnote.contentPlaintext ? (
            <TextBlockCore
              plaintext={footnote.contentPlaintext}
              facets={footnote.contentFacets}
              index={[]}
            />
          ) : (
            <span className="italic text-tertiary">Empty footnote</span>
          )}
        </div>
      </div>
    </div>
  );
}
