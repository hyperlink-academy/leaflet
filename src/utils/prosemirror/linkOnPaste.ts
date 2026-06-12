import { MarkType } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

// Links a pasted URL: wraps the current selection if there is one, otherwise
// inserts the URL text and links it. Returns true so a handlePaste can early
// out. Shared by the inline comment editors.
export function applyLinkPaste(
  view: EditorView,
  linkMark: MarkType,
  url: string,
) {
  let { from, to, empty } = view.state.selection as TextSelection;
  let tr = view.state.tr;
  if (empty) {
    tr.insertText(url, from);
    tr.addMark(from, from + url.length, linkMark.create({ href: url }));
  } else {
    tr.addMark(from, to, linkMark.create({ href: url }));
  }
  view.dispatch(tr);
  return true;
}
