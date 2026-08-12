import { describe, expect, test } from "vitest";
import { schema } from "components/Blocks/TextBlock/schema";
import { findMatchesInDoc, flattenDoc, sameMatches } from "./matcher";

let opts = (o: Partial<{ caseSensitive: boolean; wholeWord: boolean }> = {}) => ({
  caseSensitive: false,
  wholeWord: false,
  ...o,
});

let para = (...content: any[]) =>
  schema.node("doc", null, [schema.node("paragraph", null, content)]);

let text = (s: string, marks?: any[]) => schema.text(s, marks);

let sliceAt = (doc: any, range: { from: number; to: number }) =>
  doc.textBetween(range.from, range.to);

describe("findMatchesInDoc", () => {
  test("finds every occurrence and returns positions that resolve to the query", () => {
    let doc = para(text("a short man named Nigel Short"));
    let matches = findMatchesInDoc(doc, "short", opts());
    expect(matches).toHaveLength(2);
    for (let m of matches) expect(sliceAt(doc, m).toLowerCase()).toBe("short");
  });

  test("returns no matches for an empty query", () => {
    expect(findMatchesInDoc(para(text("anything")), "", opts())).toEqual([]);
  });

  test("matches across a formatting boundary", () => {
    let doc = para(text("he", [schema.marks.strong.create()]), text("llo world"));
    let matches = findMatchesInDoc(doc, "hello", opts());
    expect(matches).toHaveLength(1);
    expect(sliceAt(doc, matches[0])).toBe("hello");
  });

  test("does not match across an inline node", () => {
    let footnote = schema.nodes.footnote.create({ footnoteEntityID: "fn1" });
    let doc = para(text("cat"), footnote, text("alog"));
    expect(findMatchesInDoc(doc, "catalog", opts())).toEqual([]);
    expect(findMatchesInDoc(doc, "cat", opts())).toHaveLength(1);
  });

  test("positions stay correct after an inline node", () => {
    let mention = schema.nodes.didMention.create({ did: "did:plc:x", text: "@bob" });
    let doc = para(text("hi "), mention, text(" find me"));
    let matches = findMatchesInDoc(doc, "find", opts());
    expect(matches).toHaveLength(1);
    expect(sliceAt(doc, matches[0])).toBe("find");
  });

  describe("caseSensitive", () => {
    let doc = para(text("The theme of the thesis"));

    test("off, matches regardless of case", () => {
      expect(findMatchesInDoc(doc, "the", opts())).toHaveLength(4);
    });

    test("on, matches only exact case", () => {
      let matches = findMatchesInDoc(doc, "The", opts({ caseSensitive: true }));
      expect(matches).toHaveLength(1);
      expect(sliceAt(doc, matches[0])).toBe("The");
    });
  });

  describe("wholeWord", () => {
    test("excludes matches inside a longer word", () => {
      let doc = para(text("a cat in a catalog"));
      expect(findMatchesInDoc(doc, "cat", opts())).toHaveLength(2);
      let matches = findMatchesInDoc(doc, "cat", opts({ wholeWord: true }));
      expect(matches).toHaveLength(1);
      expect(matches[0].from).toBe(3);
    });

    test("counts punctuation as a boundary", () => {
      let doc = para(text("stop. stop, stop!"));
      expect(
        findMatchesInDoc(doc, "stop", opts({ wholeWord: true })),
      ).toHaveLength(3);
    });

    test("counts an adjacent inline node as a boundary", () => {
      let footnote = schema.nodes.footnote.create({ footnoteEntityID: "fn1" });
      let doc = para(text("cat"), footnote);
      expect(
        findMatchesInDoc(doc, "cat", opts({ wholeWord: true })),
      ).toHaveLength(1);
    });
  });

  test("treats regex metacharacters in the query literally", () => {
    let doc = para(text("a.b and axb"));
    let matches = findMatchesInDoc(doc, "a.b", opts());
    expect(matches).toHaveLength(1);
    expect(sliceAt(doc, matches[0])).toBe("a.b");
  });

  test("overlapping candidates advance past each match", () => {
    let doc = para(text("aaaa"));
    let matches = findMatchesInDoc(doc, "aa", opts());
    expect(matches).toHaveLength(2);
    expect(matches[0].to).toBeLessThanOrEqual(matches[1].from);
  });
});

describe("flattenDoc", () => {
  test("maps each text-node character to its document position", () => {
    let doc = para(text("ab"), text("cd", [schema.marks.strong.create()]));
    let { text: flat, segments } = flattenDoc(doc);
    expect(flat).toBe("abcd");
    expect(segments[0]).toEqual({ strStart: 0, docPos: 1 });
    expect(segments[1]).toEqual({ strStart: 2, docPos: 3 });
  });
});

describe("sameMatches", () => {
  let a = { blockID: "b1", from: 1, to: 4 };

  test("is true for equal lists", () => {
    expect(sameMatches([a], [{ ...a }])).toBe(true);
  });

  test("is false when a position or block differs", () => {
    expect(sameMatches([a], [{ ...a, from: 2 }])).toBe(false);
    expect(sameMatches([a], [{ ...a, blockID: "b2" }])).toBe(false);
    expect(sameMatches([a], [])).toBe(false);
  });
});
