"use client";

import { useMemo } from "react";
import { MobileSheet } from "components/MobileSheet";
import { useEntity } from "src/replicache";
import { useEditorStates } from "src/state/useEditorState";
import { getCommentDraftRange } from "components/Blocks/TextBlock/commentDraftPlugin";
import { useEditorCommentContext } from "./EditorCommentContext";
import {
  useEditorCommentDraftStore,
  useEditorCommentSheetStore,
} from "./editorCommentStores";
import { cancelEditorCommentDraft } from "./editorCommentDraftActions";
import { EditorCommentDraftComposer } from "./AnnotationSideColumn";
import { EditorCommentThread } from "./EditorCommentThread";
import { getEditorCommentQuoteText } from "./getEditorCommentQuote";

// On mobile (and canvas pages, where there's no side column) comments live in
// a slide-in panel, like the interactions drawer on published documents.
// Tapping a commented range opens just that thread; drafting opens the
// composer. A browse-all-comments flow can layer on top of this later.
export function EditorCommentMobileSheet() {
  let { pageID, comments } = useEditorCommentContext();
  let {
    pageID: sheetPageID,
    focusedCommentID,
    close,
  } = useEditorCommentSheetStore();
  let draft = useEditorCommentDraftStore((s) => s.draft);

  let draftOnThisPage = draft?.pageID === pageID;
  let focusedComment = focusedCommentID
    ? comments.find((c) => c.commentEntityID === focusedCommentID)
    : undefined;
  // Closes (with the sheet's exit animation) when the focused comment goes
  // away, e.g. if it's deleted while open
  let open =
    sheetPageID === pageID &&
    pageID !== "" &&
    (!!focusedComment || draftOnThisPage);

  return (
    <MobileSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          // Closing the sheet mid-draft discards the draft anchor
          if (draftOnThisPage) cancelEditorCommentDraft();
          close();
        }
      }}
      title={focusedComment ? "Comment" : "New Comment"}
    >
      {focusedComment ? (
        <div className="editor-comment-sheet-item">
          <div className="light-container py-1 px-1.5 mb-4">
            <EditorCommentQuote
              commentEntityID={focusedComment.commentEntityID}
              blockID={focusedComment.blockID}
            />
          </div>
          <EditorCommentThread
            commentEntityID={focusedComment.commentEntityID}
            blockID={focusedComment.blockID}
            pageID={pageID}
          />
        </div>
      ) : draft && draft.pageID === pageID ? (
        <div className="editor-comment-sheet-item ">
          <div className="light-container py-1 px-1.5 mb-4">
            <DraftQuote blockID={draft.blockID} />
          </div>
          <div className="opaque-container p-1 w-full">
            <EditorCommentDraftComposer autoFocus />
          </div>
        </div>
      ) : null}
    </MobileSheet>
  );
}

// The text the comment is anchored to, read from the block's YJS doc
function EditorCommentQuote(props: {
  commentEntityID: string;
  blockID: string;
}) {
  let text = useEntity(props.blockID, "block/text");
  let quote = useMemo(
    () => getEditorCommentQuoteText(text?.data.value, props.commentEntityID),
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
    <div className="editor-comment-quote  text-sm text-tertiary italic line-clamp-3">
      {props.quote}
    </div>
  );
}
