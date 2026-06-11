import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useEntity } from "src/replicache";
import { startCommentDraft } from "components/Comments/commentDraftActions";
import { useCommentSheetStore } from "components/Comments/commentStores";
import { CommentSmall } from "components/Icons/CommentSmall";
import { ToolbarButton } from ".";

export function CommentButton() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let pageID =
    focusedBlock?.entityType === "block" ? focusedBlock.parent : null;
  let pageType = useEntity(pageID, "page/type")?.data.value || "doc";

  // Starting a draft while signed out shows a log in / link prompt in
  // place of the composer
  return (
    <ToolbarButton
      tooltipContent={"Add Comment"}
      onClick={(e) => {
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
      <CommentSmall />
    </ToolbarButton>
  );
}
