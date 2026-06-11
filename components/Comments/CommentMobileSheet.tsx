"use client";

import { useEffect, useRef } from "react";
import { MobileSheet } from "components/MobileSheet";
import { useCommentContext } from "./CommentContext";
import { useCommentDraftStore, useCommentSheetStore } from "./commentStores";
import { cancelCommentDraft } from "./commentDraftActions";
import { CommentDraftComposer } from "./AnnotationSideColumn";
import { CommentThread } from "./CommentThread";

// On mobile (and canvas pages, where there's no side column) comments live in
// a slide-in panel, like the interactions drawer on published documents.
export function CommentMobileSheet() {
  let { pageID, comments } = useCommentContext();
  let { pageID: sheetPageID, focusedCommentID, close } = useCommentSheetStore();
  let draft = useCommentDraftStore((s) => s.draft);
  let contentRef = useRef<HTMLDivElement>(null);

  let open = sheetPageID === pageID && pageID !== "";
  let draftOnThisPage = draft?.pageID === pageID;

  useEffect(() => {
    if (!open || !focusedCommentID) return;
    // Wait for the sheet to mount before scrolling to the focused thread
    requestAnimationFrame(() => {
      let el = contentRef.current?.querySelector(
        `[data-comment-thread="${focusedCommentID}"]`,
      );
      el?.scrollIntoView({ block: "start" });
    });
  }, [open, focusedCommentID]);

  if (!open) return null;

  return (
    <MobileSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          // Closing the sheet mid-draft discards the draft anchor
          if (draftOnThisPage) cancelCommentDraft();
          close();
        }
      }}
      title="Comments"
      contentRef={contentRef}
    >
      <div className="flex flex-col gap-3">
        {draftOnThisPage && (
          <div className="comment-sheet-item border border-border-light rounded-lg bg-bg-page p-2">
            <CommentDraftComposer autoFocus />
          </div>
        )}
        {comments.length === 0 && !draftOnThisPage && (
          <div className="text-sm text-tertiary italic text-center pt-4">
            No comments yet
          </div>
        )}
        {comments.map((c) => (
          <div
            key={c.commentEntityID}
            className="comment-sheet-item border border-border-light rounded-lg bg-bg-page p-2"
          >
            <CommentThread
              commentEntityID={c.commentEntityID}
              blockID={c.blockID}
              pageID={pageID}
            />
          </div>
        ))}
      </div>
    </MobileSheet>
  );
}
