import { MarkType } from "prosemirror-model";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import { useEditorStates } from "src/state/useEditorState";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { ShortcutKey } from "components/Layout";
import { setMark } from "src/utils/prosemirror/setMark";

// Whether the focused block's current selection carries the mark. Returns a
// boolean from the store selector (rather than subscribing to the editor state
// object) so buttons only re-render when the answer flips, not on every
// transaction.
export function useMarkActive(mark: MarkType) {
  let focusedBlockID = useUIState((s) => s.focusedEntity?.entityID);
  return useEditorStates((s) => {
    let editor = focusedBlockID
      ? s.editorStates[focusedBlockID]?.editor
      : undefined;
    if (!editor) return false;
    let { to, from, $cursor } = editor.selection as TextSelection;
    if ($cursor) return !!mark.isInSet(editor.storedMarks || $cursor.marks());
    return !!rangeHasMark(editor, mark, from, to);
  });
}

export function TextDecorationButton(props: {
  mark: MarkType;
  attrs?: any;
  icon: React.ReactNode;
  tooltipContent: React.ReactNode;
}) {
  let hasMark = useMarkActive(props.mark);

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
  let { to, from, $cursor } = view.state.selection as TextSelection;
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
