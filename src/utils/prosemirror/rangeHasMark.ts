import { schema } from "components/Blocks/TextBlock/schema";
import { Mark, MarkType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

export function rangeHasMark(
  state: EditorState,
  type: MarkType,
  start: number,
  end: number,
) {
  let mark: Mark | null = null;
  let length = end - start;
  if (!type.spec.inclusive) length = length - 1;
  for (let i = 1; i <= length; i++) {
    let pos = state.doc.resolve(start + i);
    let markAtPos = pos.marks().find((f) => f.type === type);
    if (!mark) {
      if (!markAtPos) {
        return null;
      }
      mark = markAtPos;
    } else {
      if (!markAtPos) return null;
      if (mark !== markAtPos) {
        return null;
      }
    }
  }
  return mark;
}
