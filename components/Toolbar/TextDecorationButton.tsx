import { MarkType } from "prosemirror-model";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useEditorStates } from "src/state/useEditorState";
import { ShortcutKey } from "components/Layout";
import {
  isMarkActive,
  toggleMarkInSelection,
} from "src/utils/prosemirror/markInSelection";

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
    return !!editor && isMarkActive(editor, mark);
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
  toggleMarkInSelection(editor.view, markT, attrs);
}
