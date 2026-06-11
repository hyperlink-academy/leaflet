import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// Highlights the range a comment is being drafted on. A decoration rather
// than a mark so nothing is written to the shared YJS doc until the comment
// is actually submitted; the decoration set maps through edits, so the range
// it covers when the draft is submitted is the live anchor range.
export const commentDraftKey = new PluginKey<DecorationSet>("commentDraft");

export const commentDraftPlugin = new Plugin<DecorationSet>({
  key: commentDraftKey,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, set) {
      let meta = tr.getMeta(commentDraftKey) as
        | { from: number; to: number }
        | null
        | undefined;
      if (meta === null) return DecorationSet.empty;
      if (meta) {
        return DecorationSet.create(tr.doc, [
          Decoration.inline(meta.from, meta.to, {
            class: "comment-anchor comment-draft-anchor",
          }),
        ]);
      }
      return set.map(tr.mapping, tr.doc);
    },
  },
  props: {
    decorations(state) {
      return commentDraftKey.getState(state);
    },
  },
});

// The current draft range, mapped through any edits made while drafting.
export function getCommentDraftRange(
  state: EditorState,
): { from: number; to: number } | null {
  let set = commentDraftKey.getState(state);
  let deco = set?.find()[0];
  if (!deco) return null;
  return { from: deco.from, to: deco.to };
}
