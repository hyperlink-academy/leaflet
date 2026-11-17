// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import {
  embedPlayer,
  wordpressExcerpt,
  wordpressHtmlToBlocks,
} from "./wordpressToBlocks";
import type { WordpressAttachment } from "./parseWordpressExport";
import type { BuiltBlock } from "src/utils/paste/htmlToBlocks";

const UPLOADS = "https://blog.example.com/wp-content/uploads";
const convert = (
  html: string,
  attachments: Record<string, WordpressAttachment> = {},
) => wordpressHtmlToBlocks(html, { parent: "page", attachments });

const fact = (b: BuiltBlock, attribute: string) =>
  b.facts.find((f) => f.entity === b.entityID && f.attribute === attribute)
    ?.data as { value?: unknown } | undefined;
const text = (b: BuiltBlock) => b.parsedContent?.textContent ?? "";
const outline = (blocks: BuiltBlock[]) =>
  blocks
    .filter((b) => b.parent === "page")
    .map((b) => `${b.type}${text(b) ? ": " + text(b) : ""}`);

describe("wordpressHtmlToBlocks: block editor", () => {
  test("prose, headings, nested lists, quotes, and code", () => {
    const r = convert(`<!-- wp:paragraph -->
<p>Intro <strong>bold</strong> <a href="https://x.com">link</a></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p></p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Head</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>Step 1<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>flour</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list --></li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>quoted</p></blockquote>
<!-- /wp:quote -->

<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">centred</p>
<!-- /wp:paragraph -->

<!-- wp:code -->
<pre class="wp-block-code"><code>let x = 1;</code></pre>
<!-- /wp:code -->

<!-- wp:separator -->
<hr class="wp-block-separator has-alpha-channel-opacity"/>
<!-- /wp:separator -->`);
    expect(outline(r.blocks)).toEqual([
      "text: Intro bold link",
      "heading: Head",
      "text: Step 1",
      "blockquote: quoted",
      "text: centred",
      "code",
      "horizontal-rule",
    ]);
    const top = r.blocks.filter((b) => b.parent === "page");
    const nested = r.blocks.find((b) => text(b) === "flour")!;
    expect(nested.parent).toBe(top[2].entityID);
    expect(fact(top[4], "block/text-alignment")?.value).toBe("center");
    expect(fact(top[5], "block/code")?.value).toBe("let x = 1;");
  });

  test("images use the attachment's original file, with alt, width and caption", () => {
    const r = convert(
      `<!-- wp:image {"id":11,"width":"300px","sizeSlug":"large"} -->
<figure class="wp-block-image size-large is-resized aligncenter"><a href="https://elsewhere.com"><img src="${UPLOADS}/a-1024x683.png" alt="An apple" class="wp-image-11" style="width:300px;height:auto"/></a><figcaption class="wp-element-caption">A <em>caption</em></figcaption></figure>
<!-- /wp:image -->

<!-- wp:image -->
<figure class="wp-block-image"><img src="https://cdn.example.com/b.jpg" alt=""/></figure>
<!-- /wp:image -->`,
      { "11": { url: `${UPLOADS}/a.png`, width: 1500, height: 1000 } },
    );
    expect(outline(r.blocks)).toEqual(["image", "text: A caption", "image"]);
    expect(fact(r.blocks[0], "image/alt")?.value).toBe("An apple");
    expect(fact(r.blocks[0], "image/max-width")?.value).toBe(300);
    expect(fact(r.blocks[0], "block/text-alignment")?.value).toBe("center");
    expect(fact(r.blocks[1], "block/text-size")?.value).toBe("small");
    expect(fact(r.blocks[2], "image/alt")).toBeUndefined();
    expect(r.images).toEqual([
      {
        entityID: r.blocks[0].entityID,
        url: `${UPLOADS}/a.png`,
        width: 1500,
        height: 1000,
      },
      {
        entityID: r.blocks[2].entityID,
        url: "https://cdn.example.com/b.jpg",
        width: null,
        height: null,
      },
    ]);
  });

  test("an image inside a column or list is lifted out of it", () => {
    const r = convert(
      `<div class="wp-block-columns"><div class="wp-block-column"><p>left</p></div><div class="wp-block-column"><figure class="wp-block-image"><img src="${UPLOADS}/c.png"/></figure></div></div>`,
    );
    expect(outline(r.blocks)).toEqual(["text: left", "image"]);
  });

  test("galleries become a gallery block", () => {
    const r = convert(
      `<figure class="wp-block-gallery has-nested-images columns-2"><figure class="wp-block-image"><img src="${UPLOADS}/a-300x200.png" class="wp-image-1" alt="A"/></figure><figure class="wp-block-image"><img src="${UPLOADS}/b.png" class="wp-image-2"/></figure><figcaption class="blocks-gallery-caption">Two</figcaption></figure>`,
      { "1": { url: `${UPLOADS}/a.png`, width: 600, height: 400 } },
    );
    expect(outline(r.blocks)).toEqual(["image-gallery", "text: Two"]);
    expect(r.images.map((i) => i.url)).toEqual([
      `${UPLOADS}/a.png`,
      `${UPLOADS}/b.png`,
    ]);
  });

  test("embeds become players where the provider has one, else link cards", () => {
    const embed = (url: string) =>
      `<!-- wp:embed {"url":"${url}"} --><figure class="wp-block-embed"><div class="wp-block-embed__wrapper">\n${url}\n</div></figure><!-- /wp:embed -->`;
    const r = convert(
      embed("https://www.youtube.com/watch?v=abc123&amp;t=1179s") +
        embed("https://vimeo.com/1168468796") +
        embed("https://tidal.com/track/568316544"),
    );
    expect(outline(r.blocks)).toEqual(["embed", "embed", "link"]);
    expect(fact(r.blocks[0], "embed/url")?.value).toBe(
      "https://www.youtube.com/embed/abc123?start=1179",
    );
    expect(fact(r.blocks[0], "embed/aspect-ratio")?.value).toBe("16/9");
    expect(fact(r.blocks[1], "embed/url")?.value).toBe(
      "https://player.vimeo.com/video/1168468796",
    );
    expect(fact(r.blocks[2], "link/url")?.value).toBe(
      "https://tidal.com/track/568316544",
    );
  });

  test("audio and video play from WordPress in an html block", () => {
    const r = convert(
      `<!-- wp:audio {"id":1} --><figure class="wp-block-audio"><audio controls src="${UPLOADS}/song.flac"></audio></figure><!-- /wp:audio -->
<!-- wp:video {"id":2} --><figure class="wp-block-video"><video controls src="${UPLOADS}/clip.mp4"></video><figcaption>Clip</figcaption></figure><!-- /wp:video -->`,
    );
    expect(outline(r.blocks)).toEqual(["html", "html", "text: Clip"]);
    expect(fact(r.blocks[0], "embed/html")?.value).toContain(
      `<audio controls preload="metadata" src="${UPLOADS}/song.flac">`,
    );
    expect(fact(r.blocks[1], "embed/aspect-ratio")?.value).toBe("16/9");
  });

  test("a custom HTML block is an embed if it's an iframe, else raw html", () => {
    const r = convert(`<!-- wp:html -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/xyz"></iframe>
<!-- /wp:html -->

<!-- wp:html -->
<div class="widget"><p>Hi</p><script>go()</script></div>
<!-- /wp:html -->`);
    expect(outline(r.blocks)).toEqual(["embed", "html"]);
    expect(fact(r.blocks[0], "embed/url")?.value).toBe(
      "https://www.youtube.com/embed/xyz",
    );
    expect(fact(r.blocks[0], "embed/height")?.value).toBe(315);
    expect(fact(r.blocks[1], "embed/html")?.value).toBe(
      `<div class="widget"><p>Hi</p><script>go()</script></div>`,
    );
  });

  test("buttons and tables", () => {
    const r = convert(
      `<div class="wp-block-buttons"><div class="wp-block-button"><a class="wp-block-button__link" href="https://shop.example.com">Buy</a></div></div><figure class="wp-block-table"><table><tbody><tr><td>a</td></tr></tbody></table></figure>`,
    );
    expect(outline(r.blocks)).toEqual(["button", "html"]);
    expect(fact(r.blocks[0], "button/text")?.value).toBe("Buy");
    expect(fact(r.blocks[0], "button/url")?.value).toBe(
      "https://shop.example.com",
    );
    expect(fact(r.blocks[1], "embed/html")?.value).toBe(
      "<table><tbody><tr><td>a</td></tr></tbody></table>",
    );
  });

  test("footnotes become footnotes", () => {
    const r = convert(
      `<p>Claim<sup data-fn="f1" class="fn"><a href="#f1" id="f1-link">1</a></sup></p><ol class="wp-block-footnotes"><li id="f1">Source <a href="#f1-link" aria-label="Jump to footnote reference 1">↩︎</a></li></ol>`,
    );
    expect(outline(r.blocks)).toEqual(["text: Claim"]);
    expect(
      r.blocks[0].facts.filter((f) => f.attribute === "block/footnote"),
    ).toHaveLength(1);
  });

  test("links are rewritten", () => {
    const r = wordpressHtmlToBlocks(
      `<p><a href="https://blog.example.com/other/">other</a></p>`,
      {
        parent: "page",
        attachments: {},
        rewriteLink: (href) => href.replace("blog.example.com", "new.example"),
      },
    );
    expect(JSON.stringify(r.blocks[0].parsedContent?.toJSON())).toContain(
      "https://new.example/other/",
    );
  });
});

describe("wordpressHtmlToBlocks: classic editor", () => {
  test("blank lines are paragraphs and line breaks are kept", () => {
    const r = convert(`First line
same paragraph

Second paragraph

<pre>keep

this</pre>`);
    expect(outline(r.blocks)).toEqual([
      "text: First linesame paragraph",
      "text: Second paragraph",
      "code",
    ]);
    expect(fact(r.blocks[2], "block/code")?.value).toBe("keep\n\nthis");
  });

  test("a URL on its own line is an embed", () => {
    const r = convert(`Watch this:

https://youtu.be/abc123`);
    expect(outline(r.blocks)).toEqual(["text: Watch this:", "embed"]);
  });

  test("media shortcodes", () => {
    const r = convert(
      `[caption id="attachment_5" align="aligncenter" width="300"]<a href="${UPLOADS}/a.jpg"><img class="size-medium wp-image-5" src="${UPLOADS}/a-300x200.jpg" alt="" width="300" height="200" /></a> The caption[/caption]

[gallery ids="6,7"]

[embed]https://vimeo.com/123[/embed]

[audio mp3="${UPLOADS}/song.mp3"][/audio]

[contact-form-7 id="1"]`,
      {
        "5": { url: `${UPLOADS}/a.jpg`, width: 1200, height: 800 },
        "6": { url: `${UPLOADS}/b.jpg`, width: null, height: null },
        "7": { url: `${UPLOADS}/c.jpg`, width: null, height: null },
      },
    );
    expect(outline(r.blocks)).toEqual([
      "image",
      "text: The caption",
      "image-gallery",
      "embed",
      "html",
      'text: [contact-form-7 id="1"]',
    ]);
    expect(fact(r.blocks[0], "image/max-width")?.value).toBe(300);
    expect(fact(r.blocks[0], "block/text-alignment")?.value).toBe("center");
  });

  test("a gallery shortcode without ids is refused", () => {
    expect(() => convert(`[gallery]`)).toThrow(/without ids/);
  });
});

describe("embedPlayer", () => {
  test("recognises YouTube's URL shapes", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=abc",
      "https://youtu.be/abc?si=x",
      "https://m.youtube.com/shorts/abc",
    ])
      expect(embedPlayer(url)?.src).toBe("https://www.youtube.com/embed/abc");
    expect(embedPlayer("https://youtu.be/abc?t=1h2m3s")?.src).toBe(
      "https://www.youtube.com/embed/abc?start=3723",
    );
  });

  test("Spotify", () => {
    expect(
      embedPlayer("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"),
    ).toEqual({
      src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      height: 152,
    });
  });

  test("anything else has no player", () => {
    expect(embedPlayer("https://tidal.com/track/1")).toBeNull();
    expect(embedPlayer("not a url")).toBeNull();
  });
});

describe("wordpressExcerpt", () => {
  test("the excerpt as plain text", () => {
    expect(wordpressExcerpt({ excerpt: "Short." })).toBe("Short.");
    expect(
      wordpressExcerpt({ excerpt: "[caption]x[/caption]\n\nSome   text" }),
    ).toBe("Some text");
  });

  test("blank when the post has no excerpt", () => {
    expect(wordpressExcerpt({ excerpt: "" })).toBe("");
  });
});
