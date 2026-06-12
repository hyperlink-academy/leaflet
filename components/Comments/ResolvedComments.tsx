"use client";

import { useEffect, useMemo } from "react";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useCommentContext } from "./CommentContext";
import { useResolvedCommentsStore } from "./commentStores";

// Resolved comments keep their anchor marks in the text (removing them would
// trip the orphan-deletion diff on every client), so this hides their
// highlight with CSS instead, and mirrors resolution state into a store the
// editor's click handler can read synchronously. A span is only un-highlighted
// when every comment on it is resolved — anchors can carry several IDs where
// comments overlap.
export function ResolvedComments() {
  let { permissions } = useEntitySetContext();
  let { comments, resolvedCommentIDs } = useCommentContext();

  useEffect(() => {
    useResolvedCommentsStore.setState((s) => {
      let resolved = { ...s.resolved };
      for (let id of resolvedCommentIDs) resolved[id] = true;
      for (let c of comments) delete resolved[c.commentEntityID];
      return { resolved };
    });
  }, [comments, resolvedCommentIDs]);

  let css = useMemo(() => {
    // Read-only viewers don't see comments, so strip every anchor's highlight
    // (the marks stay in the doc; only their styling is neutralized)
    if (!permissions.write)
      return ".comment-anchor {\n  background: none;\n  border-bottom: none;\n  cursor: text;\n}";
    if (resolvedCommentIDs.length === 0) return "";
    let unresolvedGuards = comments
      .map((c) => `:not([data-comment-id~="${c.commentEntityID}"])`)
      .join("");
    let selector = resolvedCommentIDs
      .map(
        (id) => `.comment-anchor[data-comment-id~="${id}"]${unresolvedGuards}`,
      )
      .join(",\n");
    return `${selector} {\n  background: none;\n  border-bottom: none;\n  cursor: text;\n}`;
  }, [comments, resolvedCommentIDs, permissions.write]);

  if (!css) return null;
  return <style>{css}</style>;
}
