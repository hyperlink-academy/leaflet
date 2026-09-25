"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnchoredPopover } from "components/AnchoredPopover";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";
import { useEntity } from "src/replicache";
import { useFootnoteContext } from "./FootnoteContext";

const HOVER_OPEN_DELAY = 200;
const HOVER_CLOSE_DELAY = 150;

export type FootnoteSourcePreview = {
  footnoteID: string;
  // Matches the footnote's ref in the document text, for jumping to it.
  sourceSelector: string;
  content: ReactNode;
};

// Hovering the number in the end-of-document footnote list with a mouse (or
// tapping it on touch) previews the block the footnote was written in,
// scrolled so the footnote's ref is in view. On touch the first tap only
// previews, since there's no hover — a second tap follows the normal action.
// Returns the props for the number element and the popover to render next to
// it; without a preview the number just gets `onClick`.
export function useFootnoteSourcePreview(
  preview: FootnoteSourcePreview | undefined,
  onClick?: () => void,
) {
  let anchorRef = useRef<HTMLElement | null>(null);
  let [open, setOpen] = useState(false);
  let timer = useRef<number | null>(null);
  let lastPointerType = useRef<string | null>(null);

  let clearTimer = () => {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
  };
  let show = () => {
    clearTimer();
    setOpen(true);
  };
  let hide = () => {
    clearTimer();
    setOpen(false);
  };
  let scheduleHide = () => {
    clearTimer();
    timer.current = window.setTimeout(hide, HOVER_CLOSE_DELAY);
  };
  useEffect(() => clearTimer, []);

  // AnchoredPopover only watches the page's own scroll container; published
  // posts can also scroll the window, which would strand the popover.
  useEffect(() => {
    if (!open) return;
    let onScroll = (e: Event) => {
      if (
        e.target instanceof Element &&
        e.target.closest(".footnote-source-preview")
      )
        return;
      hide();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  if (!preview) return { triggerProps: { onClick }, popover: null };

  let jumpToSource = () => {
    hide();
    let target = Array.from(
      document.querySelectorAll<HTMLElement>(preview.sourceSelector),
    ).find(
      (el) => !el.closest(".pageLinkBlockWrapper, .footnote-source-preview"),
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  let triggerProps = {
    ref: (el: HTMLElement | null) => {
      anchorRef.current = el;
    },
    onPointerDown: (e: React.PointerEvent) => {
      lastPointerType.current = e.pointerType;
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      clearTimer();
      timer.current = window.setTimeout(show, HOVER_OPEN_DELAY);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      scheduleHide();
    },
    onClick: (e: React.MouseEvent) => {
      let wasTouch =
        lastPointerType.current === "touch" ||
        lastPointerType.current === "pen";
      lastPointerType.current = null;
      if (wasTouch && !open) {
        e.preventDefault();
        show();
        return;
      }
      hide();
      onClick?.();
    },
  };

  let popover = (
    <AnchoredPopover
      open={open}
      anchorElement={open ? anchorRef.current : null}
      onClose={hide}
      onMouseEnter={clearTimer}
      onMouseLeave={scheduleHide}
      className="footnote-popover footnote-source-preview"
    >
      <FootnoteSourcePreviewBody
        footnoteID={preview.footnoteID}
        onClick={jumpToSource}
      >
        {preview.content}
      </FootnoteSourcePreviewBody>
    </AnchoredPopover>
  );

  return { triggerProps, popover };
}

function FootnoteSourcePreviewBody(props: {
  footnoteID: string;
  onClick: () => void;
  children: ReactNode;
}) {
  let scrollRef = useRef<HTMLDivElement>(null);

  // Long blocks are clipped to a few lines, so center the footnote's ref in
  // the visible area and mark it so it stands out from the block's other refs.
  useLayoutEffect(() => {
    let container = scrollRef.current;
    if (!container) return;
    let target = container.querySelector<HTMLElement>(
      `[data-footnote-id="${CSS.escape(props.footnoteID)}"]`,
    );
    if (!target) return;
    target.classList.add("footnote-preview-target");
    let containerRect = container.getBoundingClientRect();
    let targetRect = target.getBoundingClientRect();
    container.scrollTop +=
      targetRect.top -
      containerRect.top -
      container.clientHeight / 2 +
      targetRect.height / 2;
  }, [props.footnoteID]);

  return (
    <div
      ref={scrollRef}
      role="button"
      tabIndex={-1}
      title="Jump to footnote in text"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        props.onClick();
      }}
      className="max-h-36 overflow-y-auto px-3 py-2 text-sm text-secondary whitespace-pre-wrap cursor-pointer rounded-lg"
      style={{ wordBreak: "break-word" }}
    >
      {props.children}
    </div>
  );
}

export function EditorFootnoteSourcePreview(props: { blockID: string }) {
  let text = useEntity(props.blockID, "block/text");
  let type = useEntity(props.blockID, "block/type")?.data.value;
  let { footnotes } = useFootnoteContext();
  // Inline refs are numbered by a CSS counter, so start it where this block's
  // footnotes start in the page rather than at 1.
  let firstIndex =
    footnotes.find((fn) => fn.blockID === props.blockID)?.index ?? 1;

  if (!text) return null;
  return (
    <div
      className={type === "heading" ? "font-bold" : ""}
      style={{ counterReset: `footnote ${firstIndex - 1}` }}
    >
      <RenderYJSFragment
        value={text.data.value}
        wrapper="p"
        renderComments={false}
      />
    </div>
  );
}
