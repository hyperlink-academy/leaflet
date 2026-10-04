import { describe, expect, test } from "vitest";
import { EditorState } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";
import { schema } from "./schema";
import { dropcapKey, dropcapPlugin } from "./dropcapPlugin";

const stateWith = (text: string, enabled = true) =>
  EditorState.create({
    doc: schema.node("doc", null, [
      schema.node("paragraph", null, text ? [schema.text(text)] : []),
    ]),
    plugins: [dropcapPlugin(enabled)],
  });

const decorationsOf = (state: EditorState) => {
  let plugin = dropcapKey.get(state)!;
  let set = plugin.props.decorations!.call(plugin, state) as
    | DecorationSet
    | null
    | undefined;
  return set?.find() ?? [];
};

describe("dropcapPlugin", () => {
  test("decorates the opening letter and its hugging punctuation", () => {
    let [deco] = decorationsOf(stateWith("“Tis the season"));
    expect([deco.from, deco.to]).toEqual([1, 3]);
  });

  test("leaves an empty paragraph alone", () => {
    expect(decorationsOf(stateWith(""))).toEqual([]);
  });

  test("follows the block's dropcap fact through its meta", () => {
    let state = stateWith("Hello", false);
    expect(decorationsOf(state)).toEqual([]);
    let on = state.apply(state.tr.setMeta(dropcapKey, true));
    expect(decorationsOf(on)).toHaveLength(1);
    let off = on.apply(on.tr.setMeta(dropcapKey, false));
    expect(decorationsOf(off)).toEqual([]);
  });
});
