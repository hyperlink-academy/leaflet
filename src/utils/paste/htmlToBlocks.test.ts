// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import {
  blockStartingWith,
  build,
  fixture,
  outline,
  paste,
  pasteFixture,
} from "./testHelpers";

// Real clipboard captures live in __fixtures__/captured/; everything else is
// hand-written from what we believe a source emits. See README.md.
//
// Invariants that hold for every fixture regardless of source (no stylesheet
// text as content, no literal bullet markers, no collapsed documents) are
// asserted once in fixtureInvariants.test.ts.

describe("Google Docs — whole document (captured)", () => {
  const blocks = pasteFixture("captured/google-docs.html");

  test("outline", () => {
    expect(outline(blocks)).toEqual([
      "text: Your Company",
      "text: 123 Your Street",
      "text: Your City, ST 12345",
      "text: (123) 456-7890",
      "text: Project Name",
      // The superscript "th" merges into the paragraph instead of splitting it;
      // Leaflet has no superscript mark, so it degrades to plain text.
      "text: 4th September 20XX",
      "h1: OVERVIEW",
      // The source's trailing &nbsp; survives as U+00A0 rather than folding.
      "text: Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper.\u00A0",
      "h1: Ordered list",
      // Docs writes <li><p role="presentation">text</p></li>; flattening the
      // inner <p> as its own block would double every list item.
      "ol-li: Lorem ipsum dolor sit amet, consectetuer adipiscing elit",
      "ol-li: Sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.",
      "ul-li: Dotted list",
      "  ul-li: Nest",
      "  ul-li: Child",
      "    ul-li: Another",
      "h1: SPECIFICATIONS",
      "text: Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Typi non habent claritatem insitam; est usus legentis in iis qui facit eorum claritatem. Investigationes demonstraverunt lectores legere me lius quod ii legunt saepius.",
      "h1: MILESTONES",
      "h2: Lorem Ipsum",
      "text: Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.",
    ]);
  });

  // Docs never emits <b>; weight is the only bold signal, and body text at
  // weight 400 must not pick it up.
  test("bold comes from font-weight", () => {
    expect(
      blocks.filter((b) => b.marks.includes("strong")).map((b) => b.text),
    ).toEqual([
      "Your Company",
      "4th September 20XX",
      "OVERVIEW",
      "Ordered list",
      "SPECIFICATIONS",
      "MILESTONES",
      "Lorem Ipsum",
    ]);
  });
});

// What actually breaks on Google Docs is list nesting: sublists arrive as
// *siblings* of the <li> they belong to, so without nestSiblingLists every
// level here collapses to depth 0, and mergeAndNestFlattenedLists has to leave
// the <ol> alone rather than swallowing it into the <ul> that follows.
describe("Google Docs — mid-paragraph selection (captured)", () => {
  test("outline", () => {
    expect(
      outline(pasteFixture("captured/google-docs-mid-paragraph.html")),
    ).toEqual([
      // The selection began mid-word, so Docs leads with a &nbsp;.
      "text: \u00A0sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper.\u00A0",
      "h1: Ordered list",
      "ol-li: Lorem ipsum dolor sit amet, consectetuer adipiscing elit",
      "ol-li: Sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.",
      "ul-li: Dotted list",
      "  ul-li: Nest",
      "  ul-li: Child",
      "    ul-li: Another",
    ]);
  });
});

describe("Notion (captured)", () => {
  const blocks = pasteFixture("captured/notion.html");

  test("outline", () => {
    expect(outline(blocks)).toEqual([
      "h1: Weekly To-do List",
      "text: Add your weekly to-do’s. You can always add more by typing /to-do in an empty space. Click this button to create a fresh set of to-do’s for a new week. You can drag any old to-do’s from last week to the new week @sdfsdfsdfsdfsdfsdfsdfsdfsd . ↓ asdfasdfas df asdf asdfa sdfas df asdf @",
      "text: Multiple paragraphs",
      "h2: A heading",
      "text: @Jared Pereira no icon ha this is a new subpage",
      "blockquote: This is a quote",
      "ul-li: A list",
      // Notion signs its payload with a trailing `<!-- notionvc: … -->`, which
      // must not become a block of its own.
      "  ul-li: Nested list",
    ]);
  });

  test("inline marks stay scoped to their own run", () => {
    expect(blockStartingWith(blocks, "Add your weekly").marks).toEqual([
      "code",
    ]);
    const link = blockStartingWith(blocks, "@Jared");
    expect(link.marks).toEqual(["link"]);
    expect(link.links).toEqual([
      "https://app.notion.com/p/this-is-a-new-subpage-2bd1f91923908002aa72f31fd6639fa4?pvs=21",
    ]);
  });
});

// An inline element wrapping block-level content. Google Docs was documented to
// wrap whole documents this way; neither capture above does, but Docs still
// does it around images and other editors emit the shape too. Without
// descending into the wrapper the entire document collapses into one block.
describe("inline wrapper around block content", () => {
  const blocks = pasteFixture("legacy-docs-inline-wrapper.html");

  test("outline", () => {
    expect(outline(blocks)).toEqual([
      "h1: Trip notes",
      "text: We left at 6am, which was much too early. See the itinerary for details.",
      "h2: Packing list",
      "ul-li: Snacks",
      "  ul-li: Pretzels",
      "ol-li: Leave home",
      "ol-li: Drive north",
      "text: Cancelled stop and an underlined word.",
      "image: ",
      "text: Closing thought.",
    ]);
  });

  test("marks, links and the wrapped image survive the descent", () => {
    const body = blockStartingWith(blocks, "We left at");
    // The underline rides along from Docs' own link styling, not from the
    // author underlining anything.
    expect(body.marks).toEqual(["strong", "em", "underline", "link"]);
    expect(body.links).toEqual(["https://example.com/itinerary"]);
    expect(blockStartingWith(blocks, "Cancelled stop").marks).toEqual([
      "strikethrough",
      "underline",
    ]);
    expect(blocks.find((b) => b.type === "image")?.imageURL).toBe(
      "https://lh7-us.googleusercontent.com/docsz/photo.png",
    );
  });
});

describe("Microsoft Word (desktop)", () => {
  const blocks = pasteFixture("word-desktop.html");

  test("outline", () => {
    expect(outline(blocks)).toEqual([
      "h1: Quarterly report",
      "text: Revenue was up slightly, and margins were flat.",
      "text: ",
      // Word writes these as flat <p>s tagged `mso-list`, with the bullet as
      // literal text; normalizeWordListParagraphs rebuilds the real list.
      "ul-li: North region grew",
      "ul-li: South region held steady",
      "  ul-li: Except in March",
      "h2: Next steps",
      "text: See the plan for details.",
      "text: Region | Growth",
      "text: North | 12%",
    ]);
  });

  test("marks and links", () => {
    expect(blockStartingWith(blocks, "Revenue was").marks).toEqual([
      "strong",
      "em",
      "underline",
    ]);
    expect(blockStartingWith(blocks, "See the plan").links).toEqual([
      "https://example.com/plan",
    ]);
  });
});

describe("Word Online", () => {
  const blocks = pasteFixture("word-online.html");

  test("outline", () => {
    // One list split across sibling <ul>s, with depth only in aria-level.
    expect(outline(blocks)).toEqual([
      "h1: Meeting minutes",
      "text: Attendance was strong this quarter.",
      "ul-li: Budget approved",
      "  ul-li: Pending legal review",
    ]);
  });

  test("bold comes from the font-weight style", () => {
    expect(blockStartingWith(blocks, "Attendance").marks).toEqual(["strong"]);
  });
});

describe("Word for Mac", () => {
  test("a <style> element inside the body is not content", () => {
    expect(outline(pasteFixture("word-mac-style-in-body.html"))).toEqual([
      "text: First line of the memo.",
      "text: Second line of the memo.",
    ]);
  });
});

describe("Notion", () => {
  const blocks = pasteFixture("notion.html");

  test("outline", () => {
    expect(outline(blocks)).toEqual([
      "h1: Release checklist",
      "text: Ship on Friday, hold the marketing post until launch day.",
      "ul-li: Cut the release branch",
      "  ul-li: Tag it",
      "ul-li: Run the smoke tests",
      "blockquote: Don't ship on a Friday.",
      "code: npm run build\nnpm test",
      "text: Then git push --tags.",
    ]);
  });

  test("marks and links", () => {
    const body = blockStartingWith(blocks, "Ship on Friday");
    expect(body.marks).toEqual(["strong", "em", "link"]);
    expect(body.links).toEqual(["https://example.com/launch"]);
    expect(blockStartingWith(blocks, "Then git push").marks).toEqual(["code"]);
  });
});

describe("Apple Notes", () => {
  const blocks = pasteFixture("apple-notes.html");

  test("outline", () => {
    expect(outline(blocks)).toEqual([
      "text: Weekend plans",
      "text: ",
      "text: Leave by noon and take the coast road.",
      "ul-li: Fill the tank",
      "ul-li: Check tire pressure",
      "text: Back on Sunday.",
    ]);
  });

  // Cocoa HTML Writer puts bold and underline in a <style> block keyed by
  // class, which ProseMirror's parser can't see until it's inlined.
  test("class-driven marks are recovered from the stylesheet", () => {
    expect(blockStartingWith(blocks, "Leave by").marks).toEqual([
      "strong",
      "underline",
    ]);
  });
});

// Leaflet's own copy handler (src/utils/getBlocksAsHTML.tsx) puts a private
// dialect on the clipboard: data-tex / data-bluesky-post / data-entityid divs,
// data-alignment and data-text-size attributes, pre[data-lang]. Normalizing
// other apps' HTML must not disturb any of it.
describe("Leaflet copy → paste round trip", () => {
  const blocks = pasteFixture("leaflet-copy.html");

  test("outline", () => {
    expect(outline(blocks)).toEqual([
      "h2: Field guide",
      "text: An opening line with a reference and a highlight.",
      "blockquote: Nothing gold can stay.",
      "ul-li[x]: Packed",
      "ul-li[ ]: Unpacked",
      "  ul-li: Sub item",
      "code: const x: number = 1;\nexport default x;",
      "button: Sign up",
      "horizontal-rule: ",
      "math: \\int_0^1 x^2 dx",
      "bluesky-post: ",
      "image: ",
      "card: ",
      "text: Closing line.",
    ]);
  });

  test("block attributes and inline marks survive", () => {
    expect(
      blocks.filter((b) => b.alignment).map((b) => `${b.type}: ${b.alignment}`),
    ).toEqual([
      "heading: center",
      "blockquote: left",
      "button: center",
      "math: left",
      "image: center",
    ]);
    const body = blockStartingWith(blocks, "An opening line");
    expect(body.textSize).toBe("large");
    expect(body.marks).toEqual(["strong", "link", "highlight"]);
    expect(blocks.find((b) => b.type === "code")?.codeLanguage).toBe(
      "typescript",
    );
    expect(blocks.find((b) => b.type === "button")?.buttonURL).toBe(
      "https://example.com/signup",
    );
  });

  test("KaTeX markup inside a math block never leaks out as text", () => {
    for (const b of blocks) {
      expect(b.text).not.toContain("katex");
      expect(b.text).not.toContain("∫");
    }
  });

  test("a pasted card re-keys its nested entities", () => {
    const result = build(fixture("leaflet-copy.html"));
    const card = result.blocks.find((b) => b.type === "card")!;
    const factValue = (attribute: string) =>
      (card.facts.find((f) => f.attribute === attribute)!.data as any).value;
    const newIDs = result.extraEntities.map((e) => e.entityID);

    expect(factValue("block/card")).not.toBe("old-card-root");
    expect(newIDs).toContain(factValue("block/card"));
    // The child reference has to point at the *new* child id, not the copied one.
    expect(factValue("card/block")).not.toBe("old-card-child");
    expect(newIDs).toContain(factValue("card/block"));
  });
});

// Leaflet's blockquote is a single text block, so a quote containing more than
// one block has to become several blocks — the editor's DOM parser would
// otherwise keep only the first and drop the rest on the floor.
describe("blockquotes", () => {
  test.each<[string, string, string[]]>([
    [
      "a quote wrapping a paragraph (Notion's shape)",
      `<blockquote><p>A quote</p></blockquote>`,
      ["blockquote: A quote"],
    ],
    [
      "a quote with bare text",
      `<blockquote>A quote</blockquote>`,
      ["blockquote: A quote"],
    ],
    [
      "a multi-paragraph quote keeps every paragraph",
      `<blockquote><p>First</p><p>Second</p></blockquote>`,
      ["blockquote: First", "blockquote: Second"],
    ],
    [
      "a nested quote is flattened, not dropped",
      `<blockquote><p>Outer</p><blockquote><p>Inner</p></blockquote></blockquote>`,
      ["blockquote: Outer", "blockquote: Inner"],
    ],
    [
      "a list inside a quote keeps its list blocks",
      `<blockquote><p>Intro</p><ul><li>one</li><li>two</li></ul></blockquote>`,
      ["blockquote: Intro", "ul-li: one", "ul-li: two"],
    ],
    [
      "Word's Quote style becomes a blockquote",
      `<p class=MsoQuote style='margin-left:.5in'>Quoted</p>`,
      ["blockquote: Quoted"],
    ],
    [
      "a figure-wrapped quote keeps the quote and the caption",
      `<figure><blockquote><p>Quoted</p></blockquote><figcaption>Someone</figcaption></figure>`,
      ["blockquote: Quoted", "text: Someone"],
    ],
  ])("%s", (_, html, expected) => {
    expect(outline(paste(html))).toEqual(expected);
  });

  test("marks survive inside a quote", () => {
    const blocks = paste(
      `<blockquote><p>A <strong>bold</strong> quote with a <a href="https://example.com">link</a></p></blockquote>`,
    );
    expect(blocks[0].marks).toEqual(["strong", "link"]);
    expect(blocks[0].links).toEqual(["https://example.com"]);
  });
});

describe("structural edge cases", () => {
  test.each<[string, string, string[]]>([
    [
      "headings deeper than h3 clamp instead of being dropped",
      "<h4>Four</h4><h5>Five</h5><h6>Six</h6>",
      ["h3: Four", "h3: Five", "h3: Six"],
    ],
    [
      "script, style, noscript and template content never becomes text",
      `<div><style>p{color:red}</style><script>alert(1)</script><noscript>no js</noscript><template><p>hidden</p></template><p>Real text</p></div>`,
      ["text: Real text"],
    ],
    [
      "a nested list that is a sibling of its li nests under it",
      `<ul><li>Top</li><ul><li>Nested</li></ul><li>Second top</li></ul>`,
      ["ul-li: Top", "  ul-li: Nested", "ul-li: Second top"],
    ],
    [
      "a nested list inside its li nests under it",
      `<ul><li>Top<ul><li>Nested</li></ul></li><li>Second top</li></ul>`,
      ["ul-li: Top", "  ul-li: Nested", "ul-li: Second top"],
    ],
    [
      "an ordered list nested in an unordered list keeps its own style",
      `<ul><li>Top<ol><li>One</li></ol></li></ul>`,
      ["ul-li: Top", "  ol-li: One"],
    ],
    [
      "a table row becomes one block, not one block per cell",
      `<table><tr><th>Name</th><th>Qty</th></tr><tr><td>Bolt</td><td>4</td></tr></table>`,
      ["text: Name | Qty", "text: Bolt | 4"],
    ],
    [
      "empty paragraphs are preserved as empty text blocks",
      `<p>One</p><p><br></p><p>Two</p>`,
      ["text: One", "text: ", "text: Two"],
    ],
    [
      "whitespace between block elements does not create blocks",
      `<div>\n  <p>One</p>\n  <p>Two</p>\n</div>`,
      ["text: One", "text: Two"],
    ],
    [
      "a button link keeps its own block",
      `<a href="https://example.com" data-type="button">Subscribe</a>`,
      ["button: Subscribe"],
    ],
  ])("%s", (_, html, expected) => {
    expect(outline(paste(html))).toEqual(expected);
  });

  test("inline content trailing a block-level wrapper keeps its marks", () => {
    const blocks = paste(
      `<b style="font-weight:normal"><p>Plain</p>trailing <i>text</i></b>`,
    );
    expect(outline(blocks)).toEqual(["text: Plain", "text: trailing text"]);
    expect(blocks[1].marks).toContain("em");
  });

  // Only a data-type=button link gets its own block; every other link stays an
  // inline mark, in prose or alone, rather than splitting the paragraph.
  test("links stay inline marks", () => {
    for (const html of [
      `<p>See <a href="https://example.com">this</a>.</p>`,
      `<a href="https://example.com">this</a>`,
    ]) {
      const blocks = paste(html);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("text");
      expect(blocks[0].links).toEqual(["https://example.com"]);
    }
  });

  test("a linked image becomes an image block instead of being dropped", () => {
    const blocks = paste(
      `<p>Before</p><a href="https://example.com"><img src="https://example.com/pic.png"></a>`,
    );
    expect(outline(blocks)).toEqual(["text: Before", "image: "]);
    expect(blocks[1].imageURL).toBe("https://example.com/pic.png");
  });
});
