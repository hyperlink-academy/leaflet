// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type { BuiltBlock } from "src/utils/paste/htmlToBlocks";
import {
  facetsToParagraphs,
  offprintContentToBlocks,
  type OffprintResolved,
} from "./offprintToBlocks";
import type { OffprintBlock, OffprintDocument } from "./offprintRecords";

const empty = (): OffprintResolved => ({
  components: new Map(),
  blueskyThreads: new Map(),
});
const convert = (items: OffprintBlock[], resolved = empty()) =>
  offprintContentToBlocks(items, {
    parent: "page",
    blobUrl: (cid) => `blob:${cid}`,
    resolved,
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
const blob = (cid: string) => ({
  $type: "blob" as const,
  ref: { $link: cid },
  mimeType: "image/jpeg",
  size: 1,
});
const bytes = (s: string) => new TextEncoder().encode(s).length;

describe("facetsToParagraphs", () => {
  test("marks and links over UTF-8 byte ranges", () => {
    const t = "Héllo wörld link";
    expect(
      facetsToParagraphs(t, [
        {
          index: { byteStart: 0, byteEnd: bytes("Héllo") },
          features: [{ $type: "app.offprint.richtext.facet#bold" }],
        },
        {
          index: { byteStart: bytes("Héllo "), byteEnd: bytes("Héllo wörld") },
          features: [
            { $type: "app.offprint.richtext.facet#italic" },
            { $type: "app.offprint.richtext.facet#underline" },
          ],
        },
        {
          index: { byteStart: bytes("Héllo wörld "), byteEnd: bytes(t) },
          features: [
            { $type: "app.offprint.richtext.facet#link", uri: "https://x.y" },
          ],
        },
      ]),
    ).toEqual([
      `<strong>Héllo</strong> <em><u>wörld</u></em> <a href="https://x.y">link</a>`,
    ]);
  });

  test("blank lines split paragraphs, single newlines break lines", () => {
    expect(facetsToParagraphs("\nOne\nTwo\n\nThree\n", undefined)).toEqual([
      "One<br>Two",
      "Three",
    ]);
    expect(facetsToParagraphs("", undefined)).toEqual([]);
  });

  test("a mark spanning a paragraph break is reopened in each", () => {
    expect(
      facetsToParagraphs("ab\n\ncd", [
        {
          index: { byteStart: 0, byteEnd: 6 },
          features: [{ $type: "app.offprint.richtext.facet#bold" }],
        },
      ]),
    ).toEqual(["<strong>ab</strong>", "<strong>cd</strong>"]);
  });

  test("escapes html in text", () => {
    expect(facetsToParagraphs("<b>&", undefined)).toEqual(["&lt;b&gt;&amp;"]);
  });
});

describe("offprintContentToBlocks", () => {
  test("prose blocks go through the paste pipeline", () => {
    const r = convert([
      {
        $type: "app.offprint.block.heading",
        level: 2,
        plaintext: "Head",
        textAlign: "center",
      },
      { $type: "app.offprint.block.text", plaintext: "Intro" },
      { $type: "app.offprint.block.text", plaintext: "" },
      {
        $type: "app.offprint.block.blockquote",
        content: [
          { $type: "app.offprint.block.heading", level: 1, plaintext: "Q" },
          { $type: "app.offprint.block.text", plaintext: "quote" },
        ],
      },
      {
        $type: "app.offprint.block.bulletList",
        children: [
          {
            content: { $type: "app.offprint.block.text", plaintext: "one" },
            children: [
              {
                content: {
                  $type: "app.offprint.block.text",
                  plaintext: "nested",
                },
              },
            ],
          },
          { content: { $type: "app.offprint.block.text", plaintext: "two" } },
        ],
      },
      {
        $type: "app.offprint.block.taskList",
        children: [
          {
            content: { $type: "app.offprint.block.text", plaintext: "do" },
            checked: true,
          },
        ],
      },
      { $type: "app.offprint.block.callout", plaintext: "note", emoji: "⚠️" },
      {
        $type: "app.offprint.block.codeBlock",
        code: "let x = 1;",
        language: "typescript",
      },
      { $type: "app.offprint.block.mathBlock", tex: "x^2" },
      { $type: "app.offprint.block.horizontalRule" },
    ]);
    expect(outline(r.blocks)).toEqual([
      "heading: Head",
      "text: Intro",
      "blockquote: Q",
      "blockquote: quote",
      "text: one",
      "text: two",
      "text: ☑ do",
      "blockquote: ⚠️ note",
      "code",
      "math",
      "horizontal-rule",
    ]);
    const heading = r.blocks[0];
    expect(fact(heading, "block/heading-level")?.value).toBe(2);
    expect(fact(heading, "block/text-alignment")?.value).toBe("center");
    const nested = r.blocks.find((b) => text(b) === "nested");
    expect(nested?.parent).toBe(r.blocks[4].entityID);
    expect(
      fact(r.blocks.find((b) => b.type === "code")!, "block/code")?.value,
    ).toBe("let x = 1;");
    expect(
      fact(r.blocks.find((b) => b.type === "code")!, "block/code-language")
        ?.value,
    ).toBe("typescript");
    expect(
      fact(r.blocks.find((b) => b.type === "math")!, "block/math")?.value,
    ).toBe("x^2");
    expect(r.images).toEqual([]);
  });

  test("images keep size, alt, and caption; grids become galleries", () => {
    const r = convert([
      {
        $type: "app.offprint.block.image",
        image: blob("a"),
        alt: "alt",
        width: "50%",
        alignment: "center",
        aspectRatio: { width: 400, height: 300 },
        caption: "cap",
        captionFacets: [
          {
            index: { byteStart: 0, byteEnd: 3 },
            features: [{ $type: "app.offprint.richtext.facet#bold" }],
          },
        ],
      },
      {
        $type: "app.offprint.block.imageGrid",
        images: [
          {
            image: blob("b"),
            aspectRatio: { width: 1, height: 2 },
            alt: "b alt",
          },
          { blob: blob("c") },
        ],
        caption: "grid",
      },
      {
        $type: "app.offprint.block.imageCarousel",
        images: [{ image: blob("d") }, { image: blob("e") }],
      },
    ]);
    expect(outline(r.blocks)).toEqual([
      "image",
      "text: cap",
      "image-gallery",
      "text: grid",
      "image-gallery",
    ]);
    const image = r.blocks[0];
    expect(fact(image, "image/alt")?.value).toBe("alt");
    expect(fact(image, "image/max-width")?.value).toBe(296);
    expect(fact(image, "block/text-alignment")?.value).toBe("center");
    expect(fact(r.blocks[1], "block/text-size")?.value).toBe("small");
    expect(r.images[0]).toMatchObject({
      entityID: image.entityID,
      url: "blob:a",
      width: 400,
      height: 300,
      attribute: "block/image",
    });

    const grid = r.blocks[2];
    expect(fact(grid, "gallery/format")?.value).toBe("grid");
    const children = grid.facts
      .filter((f) => f.attribute === "gallery/image")
      .map((f) => (f.data as { value: string }).value);
    expect(children).toHaveLength(2);
    expect(
      grid.facts
        .filter((f) => f.attribute === "gallery/image")
        .every((f) => f.id),
    ).toBe(true);
    expect(r.images.slice(1, 3).map((i) => [i.entityID, i.url])).toEqual([
      [children[0], "blob:b"],
      [children[1], "blob:c"],
    ]);
    expect(grid.facts.find((f) => f.attribute === "image/alt")).toMatchObject({
      entity: children[0],
      data: { value: "b alt" },
    });
    expect(r.extraEntities).toEqual(expect.arrayContaining(children));
    expect(fact(r.blocks[4], "gallery/format")?.value).toBe("carousel");
    expect(r.images).toHaveLength(5);
  });

  test("embeds, bookmarks, buttons, and bluesky posts", () => {
    const resolved = empty();
    resolved.blueskyThreads.set("at://did:plc:x/app.bsky.feed.post/1", {
      $type: "thread",
    });
    const r = convert(
      [
        {
          $type: "app.offprint.block.webEmbed",
          href: "https://youtube.com/watch?v=1",
          embedUrl: "https://youtube.com/embed/1",
          embedHeight: 450,
        },
        {
          $type: "app.offprint.block.webEmbed",
          href: "https://example.com",
          title: "Ex",
        },
        {
          $type: "app.offprint.block.webBookmark",
          href: "https://b.com",
          title: "B",
          description: "d",
          preview: blob("p"),
        },
        {
          $type: "app.offprint.block.button",
          text: "Go",
          href: "https://go",
          caption: "above",
        },
        {
          $type: "app.offprint.block.blueskyPost",
          post: { uri: "at://did:plc:x/app.bsky.feed.post/1", cid: "c" },
        },
      ],
      resolved,
    );
    expect(outline(r.blocks)).toEqual([
      "embed",
      "link",
      "link",
      "text: above",
      "button",
      "bluesky-post",
    ]);
    expect(fact(r.blocks[0], "embed/url")?.value).toBe(
      "https://youtube.com/embed/1",
    );
    expect(fact(r.blocks[0], "embed/height")?.value).toBe(450);
    expect(fact(r.blocks[1], "link/title")?.value).toBe("Ex");
    expect(r.images).toEqual([
      {
        entityID: r.blocks[2].entityID,
        url: "blob:p",
        width: null,
        height: null,
        attribute: "link/preview",
      },
    ]);
    expect(fact(r.blocks[4], "button/url")?.value).toBe("https://go");
    expect(fact(r.blocks[5], "block/bluesky-post")?.value).toEqual({
      $type: "thread",
    });
  });

  test("components are inlined; unknown blocks and unfetched refs fail", () => {
    const resolved = empty();
    resolved.components.set("at://did:plc:x/app.offprint.component/1", [
      { $type: "app.offprint.block.text", plaintext: "footer" },
    ]);
    const r = convert(
      [
        { $type: "app.offprint.block.text", plaintext: "body" },
        {
          $type: "app.offprint.block.component",
          component: "at://did:plc:x/app.offprint.component/1",
        },
      ],
      resolved,
    );
    expect(outline(r.blocks)).toEqual(["text: body", "text: footer"]);
    expect(() =>
      convert([
        { $type: "app.offprint.block.component", component: "at://nope" },
      ]),
    ).toThrow(/could not be fetched/);
    expect(() => convert([{ $type: "app.offprint.block.mystery" }])).toThrow(
      /Unsupported Offprint block/,
    );
    expect(() => convert([{ $type: "app.offprint.block.image" }])).toThrow(
      /without a blob/,
    );
  });

  test("converts a real Offprint post", () => {
    const doc = JSON.parse(
      readFileSync(
        join(__dirname, "fixtures/reflected-light-part-2.json"),
        "utf8",
      ),
    ) as OffprintDocument;
    const r = convert(doc.content.items ?? []);
    const types = outline(r.blocks).map((o) => o.split(":")[0]);
    expect(types).toContain("heading");
    expect(types).toContain("image");
    expect(types).toContain("image-gallery");
    expect(types).toContain("blockquote");
    expect(types).not.toContain("text: ");
    // Every image blob in the post is referenced exactly once.
    const cids = JSON.stringify(doc.content.items).match(
      /"\$link":"(baf[^"]+)"/g,
    )!.length;
    expect(r.images).toHaveLength(cids);
    expect(new Set(r.images.map((i) => i.entityID)).size).toBe(r.images.length);
    expect(r.blocks.every((b) => b.type !== "text" || text(b).trim())).toBe(
      true,
    );
  });
});
