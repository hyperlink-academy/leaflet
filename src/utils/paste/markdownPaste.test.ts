// @vitest-environment jsdom
//
// The text/plain paste path: when the clipboard carries no usable HTML, the
// paste handler runs the text through markdownToHtml and then through the same
// block builder the HTML path uses.
import { describe, expect, test } from "vitest";
import { markdownToHtml } from "src/htmlMarkdownParsers";
import { blockFootnotes, build, outline, paste } from "./testHelpers";

const pasteText = (text: string) => paste(markdownToHtml(text));
const buildText = (text: string) => build(markdownToHtml(text));

describe("text/plain", () => {
  test.each<[string, string, string[]]>([
    [
      "every line becomes its own block",
      "Line one\nLine two\n\nNew para",
      ["text: Line one", "text: Line two", "text: New para"],
    ],
    [
      "a setext heading is not split from its underline",
      "Title\n=====",
      ["h1: Title"],
    ],
    [
      "a multi-line blockquote stays one blockquote",
      "> quoted line one\n> quoted line two",
      ["blockquote: quoted line one quoted line two"],
    ],
    [
      "a GFM table parses as a table, not literal pipes",
      "| a | b |\n| - | - |\n| 1 | 2 |",
      ["text: a | b", "text: 1 | 2"],
    ],
    [
      "nested lists keep their depth and style",
      "- one\n- two\n  1. nested",
      ["ul-li: one", "ul-li: two", "  ol-li: nested"],
    ],
    [
      "task list state lands on the block",
      "- [ ] todo\n- [x] done",
      ["ul-li[ ]: todo", "ul-li[x]: done"],
    ],
    [
      "a horizontal rule becomes its own block",
      "above\n\n---\n\nbelow",
      ["text: above", "horizontal-rule: ", "text: below"],
    ],
    [
      // remarkRehype drops raw HTML nodes, so this used to convert to an empty
      // string and the paste silently did nothing.
      "text that is entirely HTML markup still pastes",
      "<div>hi</div>\n<span>there</span>",
      ["text: <div>hi</div>", "text: <span>there</span>"],
    ],
  ])("%s", (_, text, expected) => {
    expect(outline(pasteText(text))).toEqual(expected);
  });

  test("headings, emphasis and links", () => {
    const blocks = pasteText(
      "# One\n## Two\n\nbody **bold** and [link](https://example.com)",
    );
    expect(outline(blocks)).toEqual([
      "h1: One",
      "h2: Two",
      "text: body bold and link",
    ]);
    expect(blocks[2].marks).toEqual(["strong", "link"]);
    expect(blocks[2].links).toEqual(["https://example.com"]);
  });

  test("a fenced code block keeps its body verbatim", () => {
    // The soft-line-break expansion that turns pasted prose into one block per
    // line must not run inside a fence, or every line of code gains a blank
    // line after it.
    const blocks = pasteText(
      "Here:\n\n```js\nconst a = 1;\n\nconst b = 2;\n```",
    );
    expect(blocks[1].type).toBe("code");
    expect(blocks[1].codeLanguage).toBe("js");
    expect(blocks[1].text).toBe("const a = 1;\n\nconst b = 2;");
  });

  test("display math becomes a math block", () => {
    const blocks = pasteText("$$\nx^2 + y^2\n$$");
    expect(blocks[0].type).toBe("math");
    expect(blocks[0].text).toBe("x^2 + y^2");
  });

  test("prices are not parsed as inline math", () => {
    expect(outline(pasteText("It cost $5 and then $10."))).toEqual([
      "text: It cost $5 and then $10.",
    ]);
  });
});

describe("footnotes", () => {
  test("refs become footnote entities populated from the definitions", () => {
    const result = buildText(
      "Hello[^1] world[^b].\n\n[^1]: First note with *emphasis*.\n[^b]: Second note.\n",
    );
    // The definitions section is consumed, not pasted as trailing blocks.
    expect(result.blocks.map((b) => b.type)).toEqual(["text"]);
    const block = result.blocks[0];
    expect(block.parsedContent?.textContent).toBe("Hello world.");

    const footnotes = blockFootnotes(block);
    expect(footnotes.map((f) => f.text)).toEqual([
      "First note with emphasis.",
      "Second note.",
    ]);
    expect(result.extraEntities.map((e) => e.entityID)).toEqual(
      footnotes.map((f) => f.entityID),
    );

    // The parsed content carries footnote nodes pointing at the minted
    // entities, in the same order as the block/footnote positions.
    const nodeIDs: string[] = [];
    block.parsedContent?.descendants((node) => {
      if (node.type.name === "footnote")
        nodeIDs.push(node.attrs.footnoteEntityID);
      return true;
    });
    expect(nodeIDs).toEqual(footnotes.map((f) => f.entityID));
  });

  test("each ref to a shared definition gets its own footnote", () => {
    const result = buildText("One[^n] and two[^n].\n\n[^n]: Shared note.\n");
    const footnotes = blockFootnotes(result.blocks[0]);
    expect(footnotes.map((f) => f.text)).toEqual([
      "Shared note.",
      "Shared note.",
    ]);
    expect(new Set(footnotes.map((f) => f.entityID)).size).toBe(2);
  });

  test("a multi-paragraph definition becomes one footnote with hard breaks", () => {
    const result = buildText(
      "Ref[^m].\n\n[^m]: First paragraph.\n\n    Second paragraph.\n",
    );
    expect(blockFootnotes(result.blocks[0]).map((f) => f.text)).toEqual([
      "First paragraph.\nSecond paragraph.",
    ]);
  });

  test("footnotes inside list items land on the item's block", () => {
    const result = buildText("- item one[^a]\n- item two\n\n[^a]: Note a.\n");
    expect(result.blocks.map((b) => b.parsedContent?.textContent)).toEqual([
      "item one",
      "item two",
    ]);
    expect(blockFootnotes(result.blocks[0]).map((f) => f.text)).toEqual([
      "Note a.",
    ]);
    expect(blockFootnotes(result.blocks[1])).toEqual([]);
  });
});
