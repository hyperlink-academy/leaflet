// @vitest-environment jsdom
//
// The text/plain paste path: when the clipboard carries no usable HTML, the
// paste handler runs the text through markdownToHtml and then through the same
// block builder the HTML path uses.
import { describe, expect, test } from "vitest";
import { markdownToHtml } from "src/htmlMarkdownParsers";
import { outline, paste } from "./testHelpers";

const pasteText = (text: string) => paste(markdownToHtml(text));

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
