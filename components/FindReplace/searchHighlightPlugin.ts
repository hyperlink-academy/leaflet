import { Node } from "prosemirror-model";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export type SearchHighlight = {
  ranges: { from: number; to: number }[];
  current: number | null;
};

type SearchHighlightState = { session: number; decorations: DecorationSet };

export const searchHighlightKey = new PluginKey<SearchHighlightState>(
  "searchHighlight",
);

let session = 0;
const cleared: SearchHighlightState = {
  session: -1,
  decorations: DecorationSet.empty,
};

export const searchHighlightPlugin = new Plugin<SearchHighlightState>({
  key: searchHighlightKey,
  state: {
    init: () => cleared,
    apply(tr, value) {
      let meta = tr.getMeta(searchHighlightKey) as
        | SearchHighlight
        | null
        | undefined;
      if (meta === null) return cleared;
      if (meta)
        return {
          session,
          decorations: DecorationSet.create(
            tr.doc,
            toDecorations(meta, tr.doc),
          ),
        };
      if (value.decorations === DecorationSet.empty) return value;
      return {
        ...value,
        decorations: value.decorations.map(tr.mapping, tr.doc),
      };
    },
  },
  props: {
    decorations(state) {
      let value = searchHighlightKey.getState(state);
      return value?.session === session
        ? value.decorations
        : DecorationSet.empty;
    },
  },
});

export function hasSearchHighlights(state: EditorState) {
  return (
    searchHighlightKey.getState(state)?.decorations !== DecorationSet.empty
  );
}

export function retireSearchHighlightSession() {
  session++;
}

function toDecorations(meta: SearchHighlight, doc: Node) {
  let end = doc.content.size;
  let decorations: Decoration[] = [];
  meta.ranges.forEach((range, i) => {
    if (range.from < 0 || range.to > end || range.from >= range.to) return;
    decorations.push(
      Decoration.inline(range.from, range.to, {
        class:
          i === meta.current
            ? "search-match search-match-current"
            : "search-match",
      }),
    );
  });
  return decorations;
}
