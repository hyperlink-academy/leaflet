import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useEntity } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { startEditorCommentDraft } from "components/EditorComments/editorCommentDraftActions";
import { useEditorCommentSheetStore } from "components/EditorComments/editorCommentStores";
import { CommentTiny } from "components/Icons/CommentTiny";
import { ToolbarButton } from ".";

export function EditorCommentButton() {
  let { permissions } = useEntitySetContext();
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let pageID =
    focusedBlock?.entityType === "block" ? focusedBlock.parent : null;
  let pageType = useEntity(pageID, "page/type")?.data.value || "doc";

  // Commenting is a write interaction; hide the affordance without write access
  if (!permissions.write) return null;

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
        startEditorCommentDraft(
          editorState.view,
          focusedBlock.entityID,
          focusedBlock.parent,
        );
        // Where there's no side column (mobile, canvas), draft in the sheet
        let isDesktop = window.matchMedia("(min-width: 1280px)").matches;
        if (!isDesktop || pageType === "canvas") {
          useEditorCommentSheetStore.getState().openSheet(focusedBlock.parent);
        }
      }}
    >
      <CommentTiny className="w-6 h-6 p-0.5" />
    </ToolbarButton>
  );
}
