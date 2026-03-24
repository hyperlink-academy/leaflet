import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";

export const highlightSelectionPlugin = new Plugin({
  state: {
    init(_, { doc }) {
      return DecorationSet.empty;
    },
    apply(tr, oldDecorations, oldState, newState) {
      // Skip decoration updates for selection-only changes.
      // The inline decorations cause DOM mutations (wrapping text in <span>
      // elements) that break native selection handle dragging. When focused,
      // these decorations are invisible via CSS anyway.
      if (!tr.docChanged) {
        return oldDecorations;
      }

      let decorations = [];

      // Check if there's a selection
      const { from, to } = newState.selection;
      if (from !== to) {
        decorations.push(
          Decoration.inline(from, to, { class: "selection-highlight" }),
        );
      }

      return DecorationSet.create(newState.doc, decorations);
    },
  },
  props: {
    decorations(state) {
      return this.getState(state);
    },
  },
});
