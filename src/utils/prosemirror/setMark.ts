// Taken from https://github.com/ueberdosis/tiptap/blob/dfacb3b987b57b3ab518bae87bc3d263ebfb60d0/packages/core/src/commands/setMark.ts#L66
import { MarkType, ResolvedPos } from "@tiptap/pm/model";
import { EditorState, Transaction } from "@tiptap/pm/state";

import { TextSelection } from "prosemirror-state";
import { Mark, Schema } from "prosemirror-model";

function canSetMark(
  state: EditorState,
  tr: Transaction,
  newMarkType: MarkType,
) {
  const { selection } = tr;
  let cursor: ResolvedPos | null = null;

  if (selection instanceof TextSelection) {
    cursor = selection.$cursor;
  }

  if (cursor) {
    const currentMarks = state.storedMarks ?? cursor.marks();

    // There can be no current marks that exclude the new mark
    return (
      !!newMarkType.isInSet(currentMarks) ||
      !currentMarks.some((mark) => mark.type.excludes(newMarkType))
    );
  }

  const { ranges } = selection;

  return ranges.some(({ $from, $to }) => {
    let someNodeSupportsMark =
      $from.depth === 0
        ? state.doc.inlineContent && state.doc.type.allowsMarkType(newMarkType)
        : false;

    state.doc.nodesBetween($from.pos, $to.pos, (node, _pos, parent) => {
      // If we already found a mark that we can enable, return false to bypass the remaining search
      if (someNodeSupportsMark) {
        return false;
      }

      if (node.isInline) {
        const parentAllowsMarkType =
          !parent || parent.type.allowsMarkType(newMarkType);
        const currentMarksAllowMarkType =
          !!newMarkType.isInSet(node.marks) ||
          !node.marks.some((otherMark) => otherMark.type.excludes(newMarkType));

        someNodeSupportsMark =
          parentAllowsMarkType && currentMarksAllowMarkType;
      }
      return !someNodeSupportsMark;
    });

    return someNodeSupportsMark;
  });
}
export const setMark =
  (type: MarkType, attributes = {}) =>
  (state: EditorState, dispatch: (tr: Transaction) => void) => {
    const { selection } = state;
    const { empty, ranges } = selection;

    let tr = state.tr;
    if (empty) {
      const oldAttributes = getMarkAttributes(state, type);

      tr.addStoredMark(
        type.create({
          ...oldAttributes,
          ...attributes,
        }),
      );
    } else {
      ranges.forEach((range) => {
        const from = range.$from.pos;
        const to = range.$to.pos;

        state.doc.nodesBetween(from, to, (node, pos) => {
          const trimmedFrom = Math.max(pos, from);
          const trimmedTo = Math.min(pos + node.nodeSize, to);
          const someHasMark = node.marks.find((mark) => mark.type === type);

          // if there is already a mark of this type
          // we know that we have to merge its attributes
          // otherwise we add a fresh new mark
          if (someHasMark) {
            node.marks.forEach((mark) => {
              if (type === mark.type) {
                tr.addMark(
                  trimmedFrom,
                  trimmedTo,
                  type.create({
                    ...mark.attrs,
                    ...attributes,
                  }),
                );
              }
            });
          } else {
            tr.addMark(trimmedFrom, trimmedTo, type.create(attributes));
          }
        });
      });
    }

    dispatch(tr);
  };

function getMarkAttributes(
  state: EditorState,
  type: MarkType,
): Record<string, any> {
  const { from, to, empty } = state.selection;
  const marks: Mark[] = [];

  if (empty) {
    if (state.storedMarks) {
      marks.push(...state.storedMarks);
    }

    marks.push(...state.selection.$head.marks());
  } else {
    state.doc.nodesBetween(from, to, (node) => {
      marks.push(...node.marks);
    });
  }

  const mark = marks.find((markItem) => markItem.type.name === type.name);

  if (!mark) {
    return {};
  }

  return { ...mark.attrs };
}
