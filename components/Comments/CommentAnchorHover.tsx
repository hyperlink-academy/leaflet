"use client";

import { useEffect, useRef } from "react";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useHoveredCommentStore } from "./commentStores";

// The text side of the comment hover pairing (the thread side lives in
// FootnoteSideColumnLayout's SideItem). Comment anchors are owned by the
// ProseMirror DOM, not React, so we drive their highlight the same way
// ResolvedComments does — by reaching into the page's scroll wrapper. A single
// delegated `pointerover` recomputes the hovered anchor on every move (entering
// non-anchor text clears it), and an effect toggles the border class on the
// matching anchors when the store changes from either side.
export function CommentAnchorHover() {
  let { permissions } = useEntitySetContext();
  let ref = useRef<HTMLDivElement>(null);
  let hoveredCommentIDs = useHoveredCommentStore((s) => s.hoveredCommentIDs);

  let scrollWrapper = () =>
    (ref.current
      ?.closest(".pageWrapper")
      ?.querySelector(".pageScrollWrapper") as HTMLElement | null) ?? null;

  // Anchor hover -> store
  useEffect(() => {
    // Read-only viewers don't see comments, so there's nothing to pair
    if (!permissions.write) return;
    let wrapper = scrollWrapper();
    if (!wrapper) return;

    let onPointerOver = (e: PointerEvent) => {
      let anchor = (e.target as HTMLElement)?.closest?.(
        ".comment-anchor[data-comment-id]",
      ) as HTMLElement | null;
      let ids =
        anchor
          ?.getAttribute("data-comment-id")
          ?.split(" ")
          .filter(Boolean) ?? [];
      let current = useHoveredCommentStore.getState().hoveredCommentIDs;
      if (current.length === ids.length && current.every((id) => ids.includes(id)))
        return;
      useHoveredCommentStore.setState({ hoveredCommentIDs: ids });
    };
    let clear = () =>
      useHoveredCommentStore.setState({ hoveredCommentIDs: [] });

    wrapper.addEventListener("pointerover", onPointerOver);
    wrapper.addEventListener("pointerleave", clear);
    return () => {
      wrapper.removeEventListener("pointerover", onPointerOver);
      wrapper.removeEventListener("pointerleave", clear);
    };
  }, [permissions.write]);

  // Store -> anchor border class
  useEffect(() => {
    let wrapper = scrollWrapper();
    if (!wrapper) return;
    let highlighted = new Set(hoveredCommentIDs);
    for (let el of wrapper.querySelectorAll<HTMLElement>(".comment-anchor")) {
      let match = el
        .getAttribute("data-comment-id")
        ?.split(" ")
        .some((id) => highlighted.has(id));
      el.classList.toggle("comment-anchor-hovered", !!match);
    }
  }, [hoveredCommentIDs]);

  return <div ref={ref} className="hidden" />;
}
