"use client";

import { useEntitySetContext } from "components/EntitySetProvider";
import { pageOfParent } from "src/utils/blockGroups";
import { useEntity } from "src/replicache";
import { useUIState } from "src/useUIState";
import { CommentTiny } from "components/Icons/CommentTiny";
import { SelectionActionPopover } from "components/SelectionActionPopover";
import { startFocusedBlockCommentDraft } from "./editorCommentDraftActions";

// Selecting text in a document text block floats a popover over the selection
// with a Comment action. It reuses the published-post selection toolbar
// (SelectionActionPopover) and mirrors the toolbar's EditorCommentButton so the two
// entry points start the same comment draft. Mounted once for the whole
// editor; the `pre[data-entityid]` container scopes it to the document text
// editors (doc and canvas), not the comment/footnote composers.
export function EditorCommentSelectionPopover() {
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
      {() => <EditorCommentSelectionButton />}
    </SelectionActionPopover>
  );
}

function EditorCommentSelectionButton() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let pageID =
    focusedBlock?.entityType === "block"
      ? pageOfParent(focusedBlock.parent)
      : null;
  let pageType = useEntity(pageID, "page/type")?.data.value || "doc";

  return (
    <button
      className="flex gap-1 items-center hover:font-bold px-1"
      // mousedown + preventDefault keeps the editor's selection from collapsing
      // before startEditorCommentDraft reads it — the same reason the toolbar buttons
      // act on mousedown.
      onMouseDown={(e) => {
        e.preventDefault();
        startFocusedBlockCommentDraft(focusedBlock, pageType);
      }}
    >
      <CommentTiny /> Comment
    </button>
  );
}
