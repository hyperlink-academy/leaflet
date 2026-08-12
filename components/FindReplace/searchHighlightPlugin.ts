import { PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { createDecorationPlugin } from "src/utils/prosemirror/decorationPlugin";

export type SearchHighlight = {
  ranges: { from: number; to: number }[];
  current: number | null;
};

export const searchHighlightKey = new PluginKey<DecorationSet>(
  "searchHighlight",
);

export const searchHighlightPlugin = createDecorationPlugin(
  searchHighlightKey,
  (meta: SearchHighlight) =>
    meta.ranges.map((r, i) =>
      Decoration.inline(r.from, r.to, {
        class:
          i === meta.current
            ? "search-match search-match-current"
            : "search-match",
      }),
    ),
);
