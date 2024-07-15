import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
export const highlightSelectionPlugin = new Plugin({
  state: {
    init(_, { doc }) {
      return DecorationSet.empty;
    },
    apply(tr, oldDecorations, oldState, newState) {
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
