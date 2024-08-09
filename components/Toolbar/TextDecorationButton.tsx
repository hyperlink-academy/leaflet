import { Mark, MarkType } from "prosemirror-model";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import { publishAppEvent } from "src/eventBus";
import { useEditorStates } from "src/state/useEditorState";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { ShortcutKey } from "components/Layout";

export function TextDecorationButton(props: {
  mark: MarkType;
  attrs?: any;
  icon: React.ReactNode;
  tooltipContent: React.ReactNode;
}) {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  let hasMark: boolean = false;
  let mark: Mark | null = null;
  if (focusedEditor) {
    let { to, from, $cursor, $to, $from } = focusedEditor.editor
      .selection as TextSelection;

    mark = rangeHasMark(focusedEditor.editor, props.mark, from, to);
    if ($cursor)
      hasMark = !!props.mark.isInSet(
        focusedEditor.editor.storedMarks || $cursor.marks(),
      );
    else {
      hasMark = !!mark;
    }
  }

  return (
    <ToolbarButton
      active={hasMark}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMarkInFocusedBlock(props.mark, props.attrs);
      }}
      tooltipContent={props.tooltipContent}
    >
      {props.icon}
    </ToolbarButton>
  );
}

export function toggleMarkInFocusedBlock(mark: MarkType, attrs?: any) {
  let focusedBlock = useUIState.getState().focusedBlock;
  if (!focusedBlock) return;
  publishAppEvent(focusedBlock.entityID, "toggleMark", { mark, attrs });
}
