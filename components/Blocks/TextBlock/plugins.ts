import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";

export const highlightSelectionPlugin = new Plugin({
  state: {
    init(_, { doc }) {
      return DecorationSet.empty;
    },
    apply(tr, oldDecorations, oldState, newState) {
      // Skip selection-only changes to avoid DOM mutations that break
      // native selection handle dragging. On blur, we force an update
      // so the highlight is visible when focus moves to the toolbar.
      if (!tr.docChanged && !tr.getMeta("updateSelectionHighlight")) {
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
    handleDOMEvents: {
      blur(view) {
        view.dispatch(
          view.state.tr.setMeta("updateSelectionHighlight", true),
        );
        return false;
      },
    },
    decorations(state) {
      return this.getState(state);
    },
  },
});
