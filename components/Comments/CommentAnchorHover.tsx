"use client";

import { useEffect, useMemo } from "react";
import { elementId } from "src/utils/elementId";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useCommentContext } from "./CommentContext";
import { useHoveredCommentStore } from "./commentStores";

// The text side of the comment hover pairing (the thread side lives in
// FootnoteSideColumnLayout's SideItem). Hovering an anchor in the document
// stores its IDs (so the matching thread borders), and hovering a thread
// borders its anchor(s) here.
export function CommentAnchorHover() {
  let { permissions } = useEntitySetContext();
  let { pageID } = useCommentContext();
  let hoveredCommentIDs = useHoveredCommentStore((s) => s.hoveredCommentIDs);

  // Anchor hover -> store. A single delegated `pointerover` recomputes the
  // hovered anchor on every move (entering non-anchor text clears it). The
  // wrapper is found by id since this component mounts outside the page DOM.
  useEffect(() => {
    // Read-only viewers don't see comments, so there's nothing to pair
    if (!permissions.write) return;
    let wrapper = document.getElementById(elementId.page(pageID).container);
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
      if (
        current.length === ids.length &&
        current.every((id) => ids.includes(id))
      )
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
  }, [permissions.write, pageID]);

  // Store -> inline anchor highlight, driven by a <style> tag like
  // ResolvedComments rather than toggling a class on the spans: ProseMirror
  // owns the editable DOM and reconciles away manual class changes. The `~=`
  // token selector matches the combined "id1 id2" anchors that intersecting /
  // nested comments share, so every segment of the hovered comment highlights.
  let css = useMemo(() => {
    if (!permissions.write || hoveredCommentIDs.length === 0) return "";
    let selector = hoveredCommentIDs
      .map((id) => `.comment-anchor[data-comment-id~="${id}"]`)
      .join(",\n");
    return `${selector} {
  background: color-mix(in oklab, rgb(var(--accent-contrast)), transparent 75%);
  border-bottom: 2px solid rgb(var(--accent-contrast));
}`;
  }, [hoveredCommentIDs, permissions.write]);

  if (!css) return null;
  return <style>{css}</style>;
}
