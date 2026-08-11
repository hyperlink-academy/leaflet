import { describe, expect, test } from "vitest";
import { blocksToFeedHtml, blocksToPlainText } from "./feedHtml";
import { collapseInterTagWhitespace, markGuidsAsPermalinks } from "./feedXml";

const text = (plaintext: string, facets?: any[]) => ({
  block: { $type: "pub.leaflet.blocks.text", plaintext, facets },
});
const facet = (byteStart: number, byteEnd: number, ...features: any[]) => ({
  index: { byteStart, byteEnd },
  features,
});

const DID = "did:plc:test";
const BASE = "https://example.leaflet.pub";
const render = (blocks: any[]) => blocksToFeedHtml(blocks, DID, BASE);

describe("blocksToFeedHtml", () => {
  test("plain paragraph with no facets", () => {
    expect(render([text("hello world")])).toBe("<p>hello world</p>");
  });

  test("escapes html in text and keeps facet styling semantic", () => {
    const html = render([
      text("a <b> & test", [
        facet(2, 5, { $type: "pub.leaflet.richtext.facet#bold" }),
      ]),
    ]);
    expect(html).toBe("<p>a <b>&lt;b&gt;</b> &amp; test</p>");
  });

  test("italic, underline, strikethrough, code, highlight", () => {
    const html = render([
      text("abcdef", [
        facet(0, 1, { $type: "pub.leaflet.richtext.facet#italic" }),
        facet(1, 2, { $type: "pub.leaflet.richtext.facet#underline" }),
        facet(2, 3, { $type: "pub.leaflet.richtext.facet#strikethrough" }),
        facet(3, 4, { $type: "pub.leaflet.richtext.facet#code" }),
        facet(4, 5, { $type: "pub.leaflet.richtext.facet#highlight" }),
      ]),
    ]);
    expect(html).toBe(
      "<p><i>a</i><u>b</u><s>c</s><code>d</code><mark>e</mark>f</p>",
    );
  });

  test("links wrap other styling and escape the href", () => {
    const html = render([
      text("see here", [
        facet(
          4,
          8,
          { $type: "pub.leaflet.richtext.facet#link", uri: "https://x.test/?a=1&b=2" },
          { $type: "pub.leaflet.richtext.facet#bold" },
        ),
      ]),
    ]);
    expect(html).toBe(
      '<p>see <a href="https://x.test/?a=1&amp;b=2"><b>here</b></a></p>',
    );
  });

  test("facet byte offsets are utf-8, not utf-16", () => {
    // "é" is two bytes in utf-8; bold covers only "b".
    const html = render([
      text("éb", [facet(2, 3, { $type: "pub.leaflet.richtext.facet#bold" })]),
    ]);
    expect(html).toBe("<p>é<b>b</b></p>");
  });

  test("footnote refs number in order and collect content at the end", () => {
    const html = render([
      text("claim one", [
        facet(0, 5, {
          $type: "pub.leaflet.richtext.facet#footnote",
          footnoteId: "fn-a",
          contentPlaintext: "first note",
        }),
      ]),
      text("claim two", [
        facet(0, 5, {
          $type: "pub.leaflet.richtext.facet#footnote",
          footnoteId: "fn-b",
          contentPlaintext: "second note",
        }),
      ]),
    ]);
    expect(html).toContain("<sup>1</sup>");
    expect(html).toContain("<sup>2</sup>");
    expect(html).toContain("<ol><li>first note</li><li>second note</li></ol>");
  });

  test("repeated footnote id reuses its number", () => {
    const fn = {
      $type: "pub.leaflet.richtext.facet#footnote",
      footnoteId: "fn-a",
      contentPlaintext: "note",
    };
    const html = render([text("aa", [facet(0, 1, fn), facet(1, 2, fn)])]);
    expect(html.match(/<sup>1<\/sup>/g)).toHaveLength(2);
    expect(html.match(/<li>/g)).toHaveLength(1);
  });

  test("headers clamp levels and blockquotes nest a paragraph", () => {
    const html = render([
      { block: { $type: "pub.leaflet.blocks.header", level: 2, plaintext: "h" } },
      { block: { $type: "pub.leaflet.blocks.header", level: 9, plaintext: "deep" } },
      { block: { $type: "pub.leaflet.blocks.blockquote", plaintext: "q" } },
    ]);
    expect(html).toBe(
      "<h2>h</h2>\n<h6>deep</h6>\n<blockquote><p>q</p></blockquote>",
    );
  });

  test("code blocks escape content and carry the language class", () => {
    const html = render([
      {
        block: {
          $type: "pub.leaflet.blocks.code",
          plaintext: "if (a < b) {}",
          language: "javascript",
        },
      },
    ]);
    expect(html).toBe(
      '<pre><code class="language-javascript">if (a &lt; b) {}</code></pre>',
    );
  });

  test("lists: checkboxes, same-type nesting, cross-type nesting, ol start", () => {
    const html = render([
      {
        block: {
          $type: "pub.leaflet.blocks.unorderedList",
          children: [
            { content: text("done").block, checked: true },
            {
              content: text("parent").block,
              children: [{ content: text("nested").block }],
            },
            {
              content: text("counted").block,
              orderedListChildren: {
                $type: "pub.leaflet.blocks.orderedList",
                startIndex: 3,
                children: [{ content: text("third").block }],
              },
            },
          ],
        },
      },
    ]);
    expect(html).toBe(
      "<ul>" +
        "<li>☑ done</li>" +
        "<li>parent<ul><li>nested</li></ul></li>" +
        '<li>counted<ol start="3"><li>third</li></ol></li>' +
        "</ul>",
    );
  });

  test("ordered list at top level renders <ol>", () => {
    const html = render([
      {
        block: {
          $type: "pub.leaflet.blocks.orderedList",
          children: [{ content: text("one").block }],
        },
      },
    ]);
    expect(html).toBe("<ol><li>one</li></ol>");
  });

  test("images resolve blob refs to absolute urls with dimensions and alt", () => {
    const html = render([
      {
        block: {
          $type: "pub.leaflet.blocks.image",
          image: { ref: { $link: "bafycid" } },
          alt: 'an "image"',
          aspectRatio: { width: 800, height: 600 },
        },
      },
    ]);
    expect(html).toBe(
      `<img src="${BASE}/api/atproto_images?did=${DID}&amp;cid=bafycid&amp;width=1200&amp;v=1" alt="an &quot;image&quot;" width="800" height="600"/>`,
    );
  });

  test("bluesky post embeds link out to bsky.app", () => {
    const html = render([
      {
        block: {
          $type: "pub.leaflet.blocks.bskyPost",
          postRef: { uri: "at://did:plc:xyz/app.bsky.feed.post/3kabc" },
        },
      },
    ]);
    expect(html).toBe(
      '<p><a href="https://bsky.app/profile/did:plc:xyz/post/3kabc">View post on Bluesky</a></p>',
    );
  });

  test("interactive blocks are omitted", () => {
    const html = render([
      { block: { $type: "pub.leaflet.blocks.poll", question: "?" } },
      text("kept"),
    ]);
    expect(html).toBe("<p>kept</p>");
  });

  test("output contains no class attributes or inline styles", () => {
    const html = render([
      text("styled", [facet(0, 6, { $type: "pub.leaflet.richtext.facet#bold" })]),
      { block: { $type: "pub.leaflet.blocks.header", level: 1, plaintext: "h" } },
      { block: { $type: "pub.leaflet.blocks.blockquote", plaintext: "q" } },
    ]);
    expect(html).not.toMatch(/class=|style=/);
  });
});

describe("blocksToPlainText", () => {
  test("joins text-bearing blocks and recurses into lists", () => {
    const plain = blocksToPlainText([
      text("first para"),
      { block: { $type: "pub.leaflet.blocks.header", level: 1, plaintext: "head" } },
      {
        block: {
          $type: "pub.leaflet.blocks.unorderedList",
          children: [
            { content: text("item").block },
            {
              content: text("parent").block,
              children: [{ content: text("kid").block }],
            },
          ],
        },
      },
      { block: { $type: "pub.leaflet.blocks.poll", question: "?" } },
    ] as any);
    expect(plain).toBe("first para\n\nhead\n\nitem\nparent\nkid");
  });

  test("normalizes non-breaking spaces", () => {
    expect(blocksToPlainText([text("a b")] as any)).toBe("a b");
  });

  test("empty for image-only posts", () => {
    expect(
      blocksToPlainText([
        {
          block: {
            $type: "pub.leaflet.blocks.image",
            image: { ref: { $link: "c" } },
            aspectRatio: { width: 1, height: 1 },
          },
        },
      ] as any),
    ).toBe("");
  });
});

describe("markGuidsAsPermalinks", () => {
  test("drops isPermaLink=false outside CDATA only", () => {
    const xml =
      '<item><guid isPermaLink="false">https://x.test/a</guid>' +
      '<content:encoded><![CDATA[<p>literal <guid isPermaLink="false"> stays</p>]]></content:encoded></item>';
    expect(markGuidsAsPermalinks(xml)).toBe(
      "<item><guid>https://x.test/a</guid>" +
        '<content:encoded><![CDATA[<p>literal <guid isPermaLink="false"> stays</p>]]></content:encoded></item>',
    );
  });
});

describe("collapseInterTagWhitespace", () => {
  test("collapses between tags but preserves CDATA", () => {
    const xml = "<a>\n  <b>x</b>\n</a><c><![CDATA[keep\n  this]]></c>";
    expect(collapseInterTagWhitespace(xml)).toBe(
      "<a><b>x</b></a><c><![CDATA[keep\n  this]]></c>",
    );
  });
});
