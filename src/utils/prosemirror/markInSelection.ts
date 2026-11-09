import { MarkType } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { toggleMark } from "prosemirror-commands";
import { rangeHasMark } from "./rangeHasMark";
import { setMark } from "./setMark";

// Whether the selection carries the mark: at a cursor, whether typing would
export function isMarkActive(state: EditorState, mark: MarkType) {
  let { to, from, $cursor } = state.selection as TextSelection;
  if ($cursor) return !!mark.isInSet(state.storedMarks || $cursor.marks());
  return !!rangeHasMark(state, mark, from, to);
}

// Toggles the mark over the selection. A selection partly covered by the mark
// (or covered with other attrs) gets it everywhere rather than losing it.
export function toggleMarkInSelection(
  view: EditorView,
  markT: MarkType,
  attrs?: any,
) {
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
