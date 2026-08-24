// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { ghostHtmlToBlocks } from "./ghostToBlocks";
import type { BuiltBlock } from "src/utils/paste/htmlToBlocks";

const SITE = "https://blog.example.com";
const convert = (html: string) =>
  ghostHtmlToBlocks(html, {
    siteUrl: SITE,
    parent: "page",
    permission_set: "set",
  });

const fact = (b: BuiltBlock, attribute: string) =>
  b.facts.find((f) => f.attribute === attribute)?.data as
    | { value?: unknown }
    | undefined;
const text = (b: BuiltBlock) => b.parsedContent?.textContent ?? "";
const outline = (blocks: BuiltBlock[]) =>
  blocks
    .filter((b) => b.parent === "page")
    .map((b) => `${b.type}${text(b) ? ": " + text(b) : ""}`);

describe("ghostHtmlToBlocks", () => {
  test("prose, lists, and quotes go through the paste pipeline", () => {
    const r = convert(
      `<p>Intro <em>with</em> <a href="https://x.com">link</a></p><h2>Head</h2><ul><li>one</li><li>two</li></ul><blockquote>quote<br>more</blockquote><hr>`,
    );
    expect(outline(r.blocks)).toEqual([
      "text: Intro with link",
      "heading: Head",
      "text: one",
      "text: two",
      "blockquote: quotemore",
      "horizontal-rule",
    ]);
    expect(fact(r.blocks[1], "block/heading-level")?.value).toBe(2);
    expect(fact(r.blocks[2], "block/is-list")?.value).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  test("drops the empty paragraphs Ghost leaves behind", () => {
    const r = convert(`<p>a</p><p></p><p> </p><p>b</p>`);
    expect(outline(r.blocks)).toEqual(["text: a", "text: b"]);
  });

  test("image cards become image blocks with alt, size, and caption", () => {
    const r = convert(
      `<figure class="kg-card kg-image-card kg-card-hascaption"><img src="__GHOST_URL__/content/images/a.png" class="kg-image" alt="An apple" loading="lazy" width="800" height="600" srcset="__GHOST_URL__/content/images/size/w600/a.png 600w"><figcaption><span>A <b>caption</b></span></figcaption></figure>`,
    );
    expect(outline(r.blocks)).toEqual(["image", "text: A caption"]);
    expect(fact(r.blocks[0], "image/alt")?.value).toBe("An apple");
    expect(fact(r.blocks[1], "block/text-size")?.value).toBe("small");
    expect(r.images).toEqual([
      {
        entityID: r.blocks[0].entityID,
        url: `${SITE}/content/images/a.png`,
        alt: "An apple",
        width: 800,
        height: 600,
      },
    ]);
  });

  test("gallery cards yield one image block per image", () => {
    const r = convert(
      `<figure class="kg-card kg-gallery-card"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="__GHOST_URL__/1.png" width="10" height="10"></div><div class="kg-gallery-image"><img src="__GHOST_URL__/2.png" width="10" height="10"></div></div></div></figure>`,
    );
    expect(outline(r.blocks)).toEqual(["image", "image"]);
    expect(r.images.map((i) => i.url)).toEqual([
      `${SITE}/1.png`,
      `${SITE}/2.png`,
    ]);
  });

  test("embed cards and bare iframes become embed blocks", () => {
    const r = convert(
      `<figure class="kg-card kg-embed-card"><iframe src="https://www.youtube.com/embed/abc" height="315"></iframe></figure><iframe frameborder="0" src="https://itch.io/embed/1" width=100% height="167"></iframe>`,
    );
    expect(outline(r.blocks)).toEqual(["embed", "embed"]);
    expect(fact(r.blocks[0], "embed/url")?.value).toBe(
      "https://www.youtube.com/embed/abc",
    );
    expect(fact(r.blocks[0], "embed/height")?.value).toBe(315);
    expect(fact(r.blocks[1], "embed/height")?.value).toBe(167);
  });

  test("html cards: a lone iframe is an embed, anything else is raw html", () => {
    const r = convert(
      `<!--kg-card-begin: html--><iframe src="https://e.com/x" height="100"></iframe><!--kg-card-end: html--><!--kg-card-begin: html--><div class="thing"><b>raw</b></div><!--kg-card-end: html--><p>after</p>`,
    );
    expect(outline(r.blocks)).toEqual(["embed", "html", "text: after"]);
    expect(fact(r.blocks[1], "embed/html")?.value).toBe(
      `<div class="thing"><b>raw</b></div>`,
    );
    expect(r.warnings.map((w) => w.kind)).toEqual(["raw_html"]);
  });

  test("bookmark, button, callout, toggle, and signup cards", () => {
    const r = convert(
      `<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://site.com/post"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Desc</div></div></a></figure>` +
        `<div class="kg-card kg-button-card kg-align-center"><a href="https://buy.com" class="kg-btn kg-btn-accent">Buy now</a></div>` +
        `<div class="kg-card kg-callout-card kg-callout-card-blue"><div class="kg-callout-emoji">💡</div><div class="kg-callout-text">Note <b>this</b></div></div>` +
        `<div class="kg-card kg-toggle-card"><div class="kg-toggle-heading"><h4 class="kg-toggle-heading-text">Details</h4></div><div class="kg-toggle-content"><p>Hidden</p></div></div>` +
        `<div class="kg-card kg-signup-card"><form>…</form></div>`,
    );
    expect(outline(r.blocks)).toEqual([
      "link",
      "button",
      "blockquote: 💡 Note this",
      "heading: Details",
      "text: Hidden",
      "signup",
    ]);
    expect(fact(r.blocks[0], "link/title")?.value).toBe("Title");
    expect(fact(r.blocks[0], "link/description")?.value).toBe("Desc");
    expect(fact(r.blocks[1], "button/url")?.value).toBe("https://buy.com");
    expect(fact(r.blocks[1], "button/text")?.value).toBe("Buy now");
    expect(fact(r.blocks[3], "block/heading-level")?.value).toBe(3);
  });

  test("the paywall comment becomes a members-only delimiter", () => {
    const r = convert(`<p>free</p><!--members-only--><p>paid</p>`);
    expect(outline(r.blocks)).toEqual([
      "text: free",
      "members-only-delimiter",
      "text: paid",
    ]);
  });

  test("media cards are kept as links with a warning; unknown cards fall through", () => {
    const r = convert(
      `<figure class="kg-card kg-file-card"><a class="kg-file-card-container" href="__GHOST_URL__/content/files/x.pdf"><div class="kg-file-card-title">The PDF</div></a></figure>` +
        `<div class="kg-card kg-nft-card"><p>NFT</p></div>`,
    );
    expect(outline(r.blocks)).toEqual(["link", "text: NFT"]);
    expect(fact(r.blocks[0], "link/url")?.value).toBe(
      `${SITE}/content/files/x.pdf`,
    );
    expect(r.warnings.map((w) => w.kind)).toEqual([
      "media_linked",
      "unknown_card",
    ]);
  });
});
