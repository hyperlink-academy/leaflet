import { pageOfParent } from "src/utils/blockGroups";
import { useUIState } from "src/useUIState";
import { useEntity } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { startFocusedBlockCommentDraft } from "components/EditorComments/editorCommentDraftActions";
import { CommentTiny } from "components/Icons/CommentTiny";
import { ToolbarButton } from ".";

export function EditorCommentButton() {
  let { permissions } = useEntitySetContext();
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let pageID =
    focusedBlock?.entityType === "block"
      ? pageOfParent(focusedBlock.parent)
      : null;
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
        startFocusedBlockCommentDraft(focusedBlock, pageType);
      }}
    >
      <CommentTiny className="w-6 h-6 p-0.5" />
    </ToolbarButton>
  );
}
