import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export function createDecorationPlugin<Meta>(
  key: PluginKey<DecorationSet>,
  toDecorations: (meta: Meta) => Decoration[],
) {
  return new Plugin<DecorationSet>({
    key,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        let meta = tr.getMeta(key) as Meta | null | undefined;
        if (meta === null) return DecorationSet.empty;
        if (meta) return DecorationSet.create(tr.doc, toDecorations(meta));
        return set.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return key.getState(state);
      },
    },
  });
}
