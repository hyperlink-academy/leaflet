import { Mark, MarkType } from "prosemirror-model";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import { useEditorStates } from "src/state/useEditorState";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { ShortcutKey } from "components/Layout";
import { setMark } from "src/utils/prosemirror/setMark";

export function TextDecorationButton(props: {
  mark: MarkType;
  attrs?: any;
  icon: React.ReactNode;
  tooltipContent: React.ReactNode;
}) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
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

export function toggleMarkInFocusedBlock(markT: MarkType, attrs?: any) {
  let focusedBlock = useUIState.getState().focusedEntity;
  let editor = focusedBlock
    ? useEditorStates.getState().editorStates[focusedBlock?.entityID]
    : null;
  if (!editor) return;
  let { view } = editor;
  let { to, from, $cursor, $to, $from } = view.state.selection as TextSelection;
  let mark = rangeHasMark(view.state, markT, from, to);
  if (
    to === from &&
    markT?.isInSet(view.state.storedMarks || $cursor?.marks() || [])
  ) {
    return toggleMark(markT, attrs)(view.state, view.dispatch);
  }
  if (
    mark &&
    (!attrs || JSON.stringify(attrs) === JSON.stringify(mark.attrs))
  ) {
    toggleMark(markT, attrs)(view.state, view.dispatch);
  } else setMark(markT, attrs)(view.state, view.dispatch);
}
