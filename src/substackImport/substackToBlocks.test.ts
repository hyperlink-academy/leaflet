// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import type { BuiltBlock } from "src/utils/paste/htmlToBlocks";
import {
  substackHtmlToBlocks,
  substackImageSource,
  substackOriginalUrl,
  substackPreviewUrl,
} from "./substackToBlocks";

const convert = (html: string) =>
  substackHtmlToBlocks(html, { parent: "page" });

const fact = (b: BuiltBlock, attribute: string) =>
  b.facts.find((f) => f.attribute === attribute)?.data as
    | { value?: unknown }
    | undefined;
const text = (b: BuiltBlock) => b.parsedContent?.textContent ?? "";
const outline = (blocks: BuiltBlock[]) =>
  blocks
    .filter((b) => b.parent === "page")
    .map((b) => `${b.type}${text(b) ? ": " + text(b) : ""}`);

const attr = (value: unknown) =>
  JSON.stringify(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const S3 = "https://substack-post-media.s3.amazonaws.com/public/images";
const cdn = (transform: string, original: string) =>
  `https://substackcdn.com/image/fetch/${transform}/${encodeURIComponent(original)}`;

// The markup Substack's editor writes for an image, minus its srcsets.
const image = (
  src: string,
  a: Record<string, unknown> = {},
  figcaption = "",
) => {
  const link = `<a class="image-link image2 is-viewable-img" target="_blank" href="${cdn("$s_!aFzO!,f_auto,q_auto:good", src)}" data-component-name="Image2ToDOM"><div class="image2-inset"><picture><source type="image/webp" srcset="${cdn("w_424,c_limit,f_webp", src)} 424w" sizes="100vw"><img src="${src}" width="456" height="456" data-attrs="${attr({ src, width: 1200, height: 900, resizeWidth: null, alt: null, align: null, ...a })}" class="sizing-normal" alt=""></picture><div class="image-link-expand"><button type="button"><svg></svg></button></div></div></a>`;
  return `<div class="captioned-image-container"><figure>${link}${figcaption}</figure></div>`;
};

describe("substack image urls", () => {
  const original = `${S3}/8150329e_1200x1200.png`;

  test("unwraps CDN urls to the stored file", () => {
    expect(
      substackOriginalUrl(cdn("$s_!aFzO!,w_424,c_limit,f_webp", original)),
    ).toBe(original);
    expect(substackOriginalUrl(original)).toBe(original);
  });

  test("imports the original, but HEIC as a full-size JPEG", () => {
    expect(substackImageSource(cdn("f_auto", original))).toBe(original);
    expect(substackImageSource(cdn("f_auto", `${S3}/d5444129.heic`))).toBe(
      cdn("f_jpg,q_auto:best", `${S3}/d5444129.heic`),
    );
  });

  test("previews at the CDN's page size", () => {
    expect(
      substackPreviewUrl(cdn("f_jpg,q_auto:best", `${S3}/d5444129.heic`)),
    ).toBe(cdn("w_1456,c_limit,f_auto,q_auto:good", `${S3}/d5444129.heic`));
  });
});

describe("substackHtmlToBlocks", () => {
  test("prose, headings, lists, and quotes go through the paste pipeline", () => {
    const r = convert(
      `<p>Intro <em>with</em> <a href="https://x.com">link</a></p><h4>Head</h4><ul><li><p>one</p><ul><li><p>nested</p></li></ul></li><li><p>two</p></li></ul><blockquote><p>quote</p></blockquote><div><hr></div>`,
    );
    expect(outline(r.blocks)).toEqual([
      "text: Intro with link",
      "heading: Head",
      "text: one",
      "text: two",
      "blockquote: quote",
      "horizontal-rule",
    ]);
    expect(fact(r.blocks[2], "block/is-list")?.value).toBe(true);
    const nested = r.blocks.find((b) => text(b) === "nested");
    expect(nested?.parent).toBe(r.blocks[2].entityID);
  });

  test("drops the empty paragraphs the editor leaves as spacing", () => {
    const r = convert(
      `<p>a</p><p></p><p style="text-align: center;"></p><p>b</p>`,
    );
    expect(outline(r.blocks)).toEqual(["text: a", "text: b"]);
  });

  test("keeps paragraph alignment", () => {
    const r = convert(`<p style="text-align: center;"><em>centered</em></p>`);
    expect(fact(r.blocks[0], "block/text-alignment")?.value).toBe("center");
  });

  test("an image becomes an image block with its caption underneath", () => {
    const src = `${S3}/8150329e_1200x900.png`;
    const r = convert(
      image(
        src,
        { alt: "A cat" },
        `<figcaption class="image-caption">my <em>cat</em></figcaption>`,
      ),
    );
    expect(outline(r.blocks)).toEqual(["image", "text: my cat"]);
    expect(fact(r.blocks[0], "image/alt")?.value).toBe("A cat");
    expect(fact(r.blocks[0], "image/max-width")).toBeUndefined();
    expect(fact(r.blocks[1], "block/text-size")?.value).toBe("small");
    expect(r.images).toEqual([
      { entityID: r.blocks[0].entityID, url: src, width: 1200, height: 900 },
    ]);
  });

  test("an image the author sized down keeps its share of the column", () => {
    const r = convert(
      image(`${S3}/a_1200x900.png`, { resizeWidth: 364, align: "center" }),
    );
    expect(fact(r.blocks[0], "image/max-width")?.value).toBe(296);
    expect(fact(r.blocks[0], "block/text-alignment")?.value).toBe("center");
  });

  test("a full-width resize isn't a max width", () => {
    const r = convert(image(`${S3}/a_1200x900.png`, { resizeWidth: 728 }));
    expect(fact(r.blocks[0], "image/max-width")).toBeUndefined();
  });

  test("a HEIC image is imported from the CDN as JPEG", () => {
    const r = convert(image(`${S3}/d5444129.heic`, { type: "image/heic" }));
    expect(r.images[0].url).toBe(
      cdn("f_jpg,q_auto:best", `${S3}/d5444129.heic`),
    );
  });

  test("an image inside a list item splits the list around it", () => {
    const bare = image(`${S3}/a_10x10.png`).replace(
      /^<div class="captioned-image-container"><figure>(.*)<\/figure><\/div>$/,
      "$1",
    );
    const r = convert(
      `<ul><li><p>one</p></li><li><p>two</p>${bare}</li><li><p>three</p></li></ul>`,
    );
    expect(outline(r.blocks)).toEqual([
      "text: one",
      "text: two",
      "image",
      "text: three",
    ]);
    expect(fact(r.blocks[3], "block/is-list")?.value).toBe(true);
  });

  test("a gallery becomes a grid, sized from its file names", () => {
    const heic = cdn("$s_!x!,f_auto", `${S3}/461ec9cb.heic`);
    const r = convert(
      `<div class="image-gallery-embed" data-attrs="${attr({
        gallery: {
          images: [
            { type: "image/jpeg", src: `${S3}/40a27863_1024x768.jpeg` },
            { src: heic },
          ],
          caption: "eddie & co",
          alt: "",
          staticGalleryImage: { src: `${S3}/static_1456x720.png` },
        },
        isEditorNode: true,
      })}"></div>`,
    );
    expect(outline(r.blocks)).toEqual(["image-gallery", "text: eddie & co"]);
    const grid = r.blocks[0];
    expect(fact(grid, "gallery/format")?.value).toBe("grid");
    const children = grid.facts
      .filter((f) => f.attribute === "gallery/image")
      .map((f) => (f.data as { value: string }).value);
    expect(r.images).toEqual([
      {
        entityID: children[0],
        url: `${S3}/40a27863_1024x768.jpeg`,
        width: 1024,
        height: 768,
      },
      {
        entityID: children[1],
        url: cdn("f_jpg,q_auto:best", `${S3}/461ec9cb.heic`),
        width: null,
        height: null,
      },
    ]);
    expect(r.extraEntities).toEqual(children);
  });

  test("subscribe widgets and subscribe buttons become signup blocks", () => {
    const r = convert(
      `<div class="subscription-widget-wrap-editor" data-attrs="${attr({ url: "https://x.substack.com/subscribe?", text: "Subscribe" })}" data-component-name="SubscribeWidgetToDOM"><div class="subscription-widget show-subscribe"><div class="preamble"><p class="cta-caption">subscribble</p></div><form class="subscription-widget-subscribe"><input type="email" class="email-input" name="email"><input type="submit" class="button primary" value="Subscribe"></form></div></div>` +
        `<p class="button-wrapper" data-attrs="${attr({ url: "https://x.substack.com/subscribe?", text: "Sign up now", action: null })}" data-component-name="ButtonCreateButton"><a class="button primary" href="https://x.substack.com/subscribe?"><span>Sign up now</span></a></p>`,
    );
    expect(outline(r.blocks)).toEqual(["signup", "signup"]);
  });

  test("share buttons are dropped; other buttons are kept", () => {
    const button = (text: string, url: string) =>
      `<p class="button-wrapper" data-attrs="${attr({ url, text, action: null })}" data-component-name="ButtonCreateButton"><a class="button primary" href="${url}"><span>${text}</span></a></p>`;
    const r = convert(
      button(
        "Share",
        "https://x.substack.com/p/a-post?utm_source=substack&utm_medium=email&utm_content=share&action=share",
      ) + button("Preorder", "https://example.com/books/1"),
    );
    expect(outline(r.blocks)).toEqual(["button"]);
    expect(fact(r.blocks[0], "button/text")?.value).toBe("Preorder");
    expect(fact(r.blocks[0], "button/url")?.value).toBe(
      "https://example.com/books/1",
    );
  });

  test("video and audio embeds become embed blocks", () => {
    const r = convert(
      `<div id="youtube2-z9T" class="youtube-wrap" data-attrs="${attr({ videoId: "z9T" })}" data-component-name="Youtube2ToDOM"><div class="youtube-inner"><iframe src="https://www.youtube-nocookie.com/embed/z9T?rel=0" frameborder="0" width="728" height="409"></iframe></div></div>` +
        `<iframe class="spotify-wrap album" data-attrs="${attr({ url: "https://open.spotify.com/album/4eL" })}" src="https://open.spotify.com/embed/album/4eL" frameborder="0" data-component-name="Spotify2ToDOM"></iframe>`,
    );
    expect(outline(r.blocks)).toEqual(["embed", "embed"]);
    expect(fact(r.blocks[0], "embed/url")?.value).toBe(
      "https://www.youtube-nocookie.com/embed/z9T?rel=0",
    );
    expect(fact(r.blocks[0], "embed/height")?.value).toBe(409);
    expect(fact(r.blocks[1], "embed/url")?.value).toBe(
      "https://open.spotify.com/embed/album/4eL",
    );
  });

  test("tweets and embedded posts become link blocks", () => {
    const r = convert(
      `<div class="twitter-embed" data-attrs="${attr({ url: "https://twitter.com/hamishmckenzie/status/941", full_text: "Twitter is an amazing tool and an awful place.", username: "hamishmckenzie", name: "Hamish McKenzie" })}" data-component-name="Twitter2ToDOM"></div>` +
        `<div class="embedded-post-wrap" data-attrs="${attr({ id: 1, url: "https://b.substack.com/p/insects", publication_name: "Bentham's Newsletter", title: "Insects Matter" })}" data-component-name="EmbeddedPostToDOM"><div class="embedded-post-header"></div></div>`,
    );
    expect(outline(r.blocks)).toEqual(["link", "link"]);
    expect(fact(r.blocks[0], "link/url")?.value).toBe(
      "https://twitter.com/hamishmckenzie/status/941",
    );
    expect(fact(r.blocks[0], "link/title")?.value).toBe(
      "Hamish McKenzie (@hamishmckenzie)",
    );
    expect(fact(r.blocks[1], "link/title")?.value).toBe("Insects Matter");
    expect(fact(r.blocks[1], "link/description")?.value).toBe(
      "Bentham's Newsletter",
    );
  });

  test("a mention becomes the person's name", () => {
    const r = convert(
      `<p>a show <span class="mention-wrap" data-attrs="${attr({ name: "Amelia", id: 6287763, type: "user", url: null })}" data-component-name="MentionToDOM"></span> did the lighting for</p>`,
    );
    expect(outline(r.blocks)).toEqual([
      "text: a show Amelia did the lighting for",
    ]);
  });

  test("footnotes become footnote entities on the block that cites them", () => {
    const r = convert(
      `<p>A claim.<a class="footnote-anchor" data-component-name="FootnoteAnchorToDOM" id="footnote-anchor-1" href="#footnote-1" target="_self">1</a></p><p>More.</p>` +
        `<div class="footnote" data-component-name="FootnoteToDOM"><a id="footnote-1" href="#footnote-anchor-1" class="footnote-number" contenteditable="false" target="_self">1</a><div class="footnote-content"><p>I swear I <a href="https://example.com">read it</a>.</p></div></div>`,
    );
    expect(outline(r.blocks).map((o) => o.split(":")[0])).toEqual([
      "text",
      "text",
    ]);
    const refs = r.blocks[0].facts.filter(
      (f) => f.attribute === "block/footnote",
    );
    expect(refs).toHaveLength(1);
    expect(r.extraEntities).toEqual([
      (refs[0].data as { value: string }).value,
    ]);
  });

  test("rewrites links", () => {
    const r = substackHtmlToBlocks(
      `<p><a href="https://x.substack.com/p/old">old</a></p>`,
      { parent: "page", rewriteLink: (href) => href.replace("/p/", "/") },
    );
    const link = r.blocks[0].parsedContent
      ?.nodeAt(1)
      ?.marks.find((m) => m.type.name === "link");
    expect(link?.attrs.href).toBe("https://x.substack.com/old");
  });

  test("refuses components with no Leaflet equivalent", () => {
    expect(() =>
      convert(
        `<div class="native-video-embed" data-component-name="VideoPlaceholder" data-attrs="${attr({ mediaUploadId: "b4b5" })}"></div>`,
      ),
    ).toThrow('Unsupported Substack component "VideoPlaceholder"');
  });
});
