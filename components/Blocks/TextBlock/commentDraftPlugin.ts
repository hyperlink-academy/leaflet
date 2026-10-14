import { EditorState, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { createDecorationPlugin } from "src/utils/prosemirror/decorationPlugin";

// Highlights the range a comment is being drafted on. A decoration rather
// than a mark so nothing is written to the shared YJS doc until the comment
// is actually submitted; the decoration set maps through edits, so the range
// it covers when the draft is submitted is the live anchor range.
export const commentDraftKey = new PluginKey<DecorationSet>("commentDraft");

export const commentDraftPlugin = createDecorationPlugin(
  commentDraftKey,
  (meta: { from: number; to: number }) => [
    Decoration.inline(meta.from, meta.to, {
      class: "comment-anchor comment-draft-anchor",
    }),
  ],
);

// The current draft range, mapped through any edits made while drafting.
export function getCommentDraftRange(
  state: EditorState,
): { from: number; to: number } | null {
  let set = commentDraftKey.getState(state);
  let deco = set?.find()[0];
  if (!deco) return null;
  return { from: deco.from, to: deco.to };
}
