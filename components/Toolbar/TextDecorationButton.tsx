import { useEditorStates } from "components/TextBlock";
import { MarkType } from "prosemirror-model";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import { publishAppEvent } from "src/eventBus";

export function TextDecorationButton(props: {
  mark: MarkType;
  icon: React.ReactNode;
}) {
  let focusedTextBlock = useUIState((s) => s.focusedTextBlock);
  let focusedEditor = useEditorStates((s) =>
    focusedTextBlock ? s.editorStates[focusedTextBlock] : null,
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
        console.log("yo?");
        toggleMarkInFocusedBlock(props.mark);
      }}
    >
      {props.icon}
    </ToolbarButton>
  );
}

export function toggleMarkInFocusedBlock(mark: MarkType) {
  let focusedBlock = useUIState.getState().focusedTextBlock;
  if (!focusedBlock) return;
  publishAppEvent(focusedBlock, "toggleMark", { mark });
}
