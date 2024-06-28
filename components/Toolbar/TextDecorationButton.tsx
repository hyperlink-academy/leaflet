import { MarkType } from "prosemirror-model";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import { publishAppEvent } from "src/eventBus";
import { useEditorStates } from "src/state/useEditorState";

export function TextDecorationButton(props: {
  mark: MarkType;
  icon: React.ReactNode;
}) {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  let hasMark: boolean = false;
  if (focusedEditor) {
    let { to, from, $cursor } = focusedEditor.editor.selection as TextSelection;
    if ($cursor)
      hasMark = !!props.mark.isInSet(
        focusedEditor.editor.storedMarks || $cursor.marks(),
      );
    else hasMark = focusedEditor.editor.doc.rangeHasMark(from, to, props.mark);
  }

  return (
    <ToolbarButton
      active={hasMark}
      onClick={(e) => {
        e.preventDefault();
        toggleMarkInFocusedBlock(props.mark);
      }}
    >
      {props.icon}
    </ToolbarButton>
  );
}

export function toggleMarkInFocusedBlock(mark: MarkType) {
  let focusedBlock = useUIState.getState().focusedBlock;
  if (!focusedBlock) return;
  publishAppEvent(focusedBlock.entityID, "toggleMark", { mark });
}
