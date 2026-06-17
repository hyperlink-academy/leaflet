"use client";

import { useEntitySetContext } from "components/EntitySetProvider";
import { useEntity } from "src/replicache";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { CommentTiny } from "components/Icons/CommentTiny";
import { SelectionActionPopover } from "components/SelectionActionPopover";
import { startCommentDraft } from "./commentDraftActions";
import { useCommentSheetStore } from "./commentStores";

// Selecting text in a document text block floats a popover over the selection
// with a Comment action. It reuses the published-post selection toolbar
// (SelectionActionPopover) and mirrors the toolbar's CommentButton so the two
// entry points start the same comment draft. Mounted once for the whole
// editor; the `pre[data-entityid]` container scopes it to the document text
// editors (doc and canvas), not the comment/footnote composers.
export function CommentSelectionPopover() {
  let { permissions } = useEntitySetContext();
  // Commenting is a write interaction; hide the affordance without write access
  if (!permissions.write) return null;
  return (
    <SelectionActionPopover
      containerSelector="pre[data-entityid]"
      resolve={({ container }) => {
        let blockID = (container as HTMLElement).dataset.entityid;
        return blockID ? { blockID } : null;
      }}
    >
      {() => <CommentSelectionButton />}
    </SelectionActionPopover>
  );
}

function CommentSelectionButton() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let pageID =
    focusedBlock?.entityType === "block" ? focusedBlock.parent : null;
  let pageType = useEntity(pageID, "page/type")?.data.value || "doc";

  return (
    <button
      className="flex gap-1 items-center hover:font-bold px-1"
      // mousedown + preventDefault keeps the editor's selection from collapsing
      // before startCommentDraft reads it — the same reason the toolbar buttons
      // act on mousedown.
      onMouseDown={(e) => {
        e.preventDefault();
        if (!focusedBlock || focusedBlock.entityType !== "block") return;
        let editorState =
          useEditorStates.getState().editorStates[focusedBlock.entityID];
        if (!editorState?.view) return;
        startCommentDraft(
          editorState.view,
          focusedBlock.entityID,
          focusedBlock.parent,
        );
        // Where there's no side column (mobile, canvas), draft in the sheet
        let isDesktop = window.matchMedia("(min-width: 1280px)").matches;
        if (!isDesktop || pageType === "canvas") {
          useCommentSheetStore.getState().openSheet(focusedBlock.parent);
        }
      }}
    >
      <CommentTiny /> Comment
    </button>
  );
}
