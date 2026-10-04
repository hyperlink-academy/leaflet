import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { dropcapLength } from "src/utils/dropcap";

export const dropcapKey = new PluginKey<boolean>("dropcap");

// The published page draws the drop cap with ::first-letter, but inside a
// contenteditable WebKit mis-tracks caret offsets around a ::first-letter
// (deleting two characters at a time, caret landing after the letter), so the
// editor marks the same characters with a decoration span instead.
export const dropcapPlugin = (enabled: boolean) =>
  new Plugin<boolean>({
    key: dropcapKey,
    state: {
      init: () => enabled,
      apply(tr, value) {
        let meta = tr.getMeta(dropcapKey);
        return typeof meta === "boolean" ? meta : value;
      },
    },
    props: {
      decorations(state) {
        if (!this.getState(state)) return DecorationSet.empty;
        let paragraph = state.doc.firstChild;
        let firstInline = paragraph?.firstChild;
        if (!paragraph?.isTextblock || !firstInline?.isText) return null;
        let length = dropcapLength(firstInline.text || "");
        if (length === 0) return null;
        return DecorationSet.create(state.doc, [
          Decoration.inline(1, 1 + length, { class: "dropcap-letter" }),
        ]);
      },
    },
  });
