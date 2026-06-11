"use client";

import { useMemo } from "react";
import { MobileSheet } from "components/MobileSheet";
import { useEntity } from "src/replicache";
import { useEditorStates } from "src/state/useEditorState";
import { getCommentDraftRange } from "components/Blocks/TextBlock/commentDraftPlugin";
import { useCommentContext } from "./CommentContext";
import { useCommentDraftStore, useCommentSheetStore } from "./commentStores";
import { cancelCommentDraft } from "./commentDraftActions";
import { CommentDraftComposer } from "./AnnotationSideColumn";
import { CommentThread } from "./CommentThread";
import { getCommentQuoteText } from "./getCommentQuote";

// On mobile (and canvas pages, where there's no side column) comments live in
// a slide-in panel, like the interactions drawer on published documents.
// Tapping a commented range opens just that thread; drafting opens the
// composer. A browse-all-comments flow can layer on top of this later.
export function CommentMobileSheet() {
  let { pageID, comments } = useCommentContext();
  let { pageID: sheetPageID, focusedCommentID, close } = useCommentSheetStore();
  let draft = useCommentDraftStore((s) => s.draft);

  let open = sheetPageID === pageID && pageID !== "";
  let draftOnThisPage = draft?.pageID === pageID;
  let focusedComment = focusedCommentID
    ? comments.find((c) => c.commentEntityID === focusedCommentID)
    : undefined;

  if (!open || (!focusedComment && !draftOnThisPage)) return null;

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
      title={focusedComment ? "Comment" : "New Comment"}
    >
      {focusedComment ? (
        <div className="comment-sheet-item border border-border-light rounded-lg bg-bg-page p-2">
          <CommentQuote
            commentEntityID={focusedComment.commentEntityID}
            blockID={focusedComment.blockID}
          />
          <CommentThread
            commentEntityID={focusedComment.commentEntityID}
            blockID={focusedComment.blockID}
            pageID={pageID}
          />
        </div>
      ) : draft && draft.pageID === pageID ? (
        <div className="comment-sheet-item border border-border-light rounded-lg bg-bg-page p-2">
          <DraftQuote blockID={draft.blockID} />
          <CommentDraftComposer autoFocus />
        </div>
      ) : null}
    </MobileSheet>
  );
}

// The text the comment is anchored to, read from the block's YJS doc
function CommentQuote(props: { commentEntityID: string; blockID: string }) {
  let text = useEntity(props.blockID, "block/text");
  let quote = useMemo(
    () => getCommentQuoteText(text?.data.value, props.commentEntityID),
    [text?.data.value, props.commentEntityID],
  );
  return <QuoteDisplay quote={quote} />;
}

// While drafting the anchor is still a decoration, so read the range from the
// block's editor instead
function DraftQuote(props: { blockID: string }) {
  let editor = useEditorStates((s) => s.editorStates[props.blockID]?.editor);
  let quote = "";
  if (editor) {
    let range = getCommentDraftRange(editor);
    if (range) quote = editor.doc.textBetween(range.from, range.to, " ", "￼");
  }
  return <QuoteDisplay quote={quote} />;
}

function QuoteDisplay(props: { quote: string }) {
  if (!props.quote) return null;
  return (
    <div className="comment-quote border-l-2 border-border pl-2 mb-2 text-sm text-tertiary italic line-clamp-2">
      {props.quote}
    </div>
  );
}
