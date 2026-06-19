"use client";

import { useEffect, useMemo } from "react";
import { elementId } from "src/utils/elementId";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useEditorCommentContext } from "./EditorCommentContext";
import { useHoveredEditorCommentStore } from "./editorCommentStores";

// The text side of the comment hover pairing (the thread side lives in
// FootnoteSideColumnLayout's SideItem). Hovering an anchor in the document
// stores its IDs (so the matching thread borders), and hovering a thread
// borders its anchor(s) here.
export function EditorCommentAnchorHover() {
  let { permissions } = useEntitySetContext();
  let { pageID } = useEditorCommentContext();
  let hoveredCommentIDs = useHoveredEditorCommentStore((s) => s.hoveredCommentIDs);

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
      let current = useHoveredEditorCommentStore.getState().hoveredCommentIDs;
      if (
        current.length === ids.length &&
        current.every((id) => ids.includes(id))
      )
        return;
      useHoveredEditorCommentStore.setState({ hoveredCommentIDs: ids });
    };
    let clear = () =>
      useHoveredEditorCommentStore.setState({ hoveredCommentIDs: [] });

    wrapper.addEventListener("pointerover", onPointerOver);
    wrapper.addEventListener("pointerleave", clear);
    return () => {
      wrapper.removeEventListener("pointerover", onPointerOver);
      wrapper.removeEventListener("pointerleave", clear);
    };
  }, [permissions.write, pageID]);

  // Store -> inline anchor highlight, driven by a <style> tag rather than
  // toggling a class on the spans: ProseMirror owns the editable DOM and
  // reconciles away manual class changes. The `~=` token selector matches the
  // combined "id1 id2" anchors that intersecting / nested comments share, so
  // every segment of the hovered comment highlights.
  let css = useMemo(() => {
    if (!permissions.write || hoveredCommentIDs.length === 0) return "";
    // Scope to this page's container so the global <style> only lights up the
    // hovered anchor in this page, not an identical comment mark re-rendered
    // elsewhere. (id has slashes, so match it as an attribute, not a #id.)
    let scope = `[id="${elementId.page(pageID).container}"] `;
    let selector = hoveredCommentIDs
      .map((id) => `${scope}.comment-anchor[data-comment-id~="${id}"]`)
      .join(",\n");
    return `${selector} {
  background: color-mix(in oklab, rgb(var(--accent-contrast)), transparent 75%);
  border-bottom: 2px solid rgb(var(--accent-contrast));
}`;
  }, [hoveredCommentIDs, permissions.write, pageID]);

  if (!css) return null;
  return <style>{css}</style>;
}
