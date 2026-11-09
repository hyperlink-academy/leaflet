import { describe, expect, it } from "vitest";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { multiBlockSchema as s } from "components/Blocks/TextBlock/schema";
import { isMarkActive, toggleMarkInSelection } from "./markInSelection";

const strong = s.marks.strong;

// "one two" with "two" bold, the selection over [from, to)
function editor(from: number, to = from) {
  let doc = s.nodes.doc.create(null, [
    s.nodes.paragraph.create(null, [
      s.text("one "),
      s.text("two", [strong.create()]),
    ]),
  ]);
  let state = EditorState.create({ doc });
  state = state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, from, to)),
  );
  let view = {
    get state() {
      return state;
    },
    dispatch(tr: Transaction) {
      state = state.apply(tr);
    },
  } as unknown as EditorView;
  return view;
}

const boldText = (view: EditorView) => {
  let text = "";
  view.state.doc.descendants((n) => {
    if (n.isText && strong.isInSet(n.marks)) text += n.text;
  });
  return text;
};

describe("isMarkActive", () => {
  it("follows the cursor's marks", () => {
    expect(isMarkActive(editor(2).state, strong)).toBe(false);
    expect(isMarkActive(editor(7).state, strong)).toBe(true);
  });
  it("is on only for a range the mark covers", () => {
    expect(isMarkActive(editor(3, 7).state, strong)).toBe(false);
    expect(isMarkActive(editor(5, 8).state, strong)).toBe(true);
  });
});

describe("toggleMarkInSelection", () => {
  it("marks an unmarked range", () => {
    let view = editor(1, 4);
    toggleMarkInSelection(view, strong);
    expect(boldText(view)).toBe("onetwo");
  });
  it("unmarks a fully marked range", () => {
    let view = editor(5, 8);
    toggleMarkInSelection(view, strong);
    expect(boldText(view)).toBe("");
  });
  it("spreads the mark over a partly marked range instead of removing it", () => {
    let view = editor(3, 8);
    toggleMarkInSelection(view, strong);
    expect(boldText(view)).toBe("e two");
  });
  it("stores the mark for typing at a cursor", () => {
    let view = editor(2);
    toggleMarkInSelection(view, strong);
    expect(isMarkActive(view.state, strong)).toBe(true);
  });
});
