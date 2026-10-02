import { describe, expect, it } from "vitest";
import { processBlocksToPages } from "./factsToPagesRecord";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

let n = 0;
const fact = (f: Omit<Fact<Attribute>, "id">) =>
  ({ id: `f${n++}`, ...f }) as Fact<Attribute>;
const block = (entity: string, value: string) =>
  fact({
    entity,
    attribute: "block/type",
    data: { type: "block-type-union", value },
  } as Omit<Fact<"block/type">, "id">);
const child = (parent: string, value: string, position: string) =>
  fact({
    entity: parent,
    attribute: "card/block",
    data: { type: "ordered-reference", value, position },
  });

describe("processBlocksToPages", () => {
  it("publishes a canvas page's background image and pattern", async () => {
    let facts = [
      fact({
        entity: "root",
        attribute: "root/page",
        data: { type: "ordered-reference", value: "page", position: "a0" },
      }),
      fact({
        entity: "page",
        attribute: "page/type",
        data: { type: "page-type-union", value: "canvas" },
      }),
      fact({
        entity: "page",
        attribute: "canvas/background-pattern",
        data: { type: "canvas-pattern-union", value: "plain" },
      }),
      fact({
        entity: "page",
        attribute: "theme/card-background-image",
        data: {
          type: "image",
          src: "https://example.com/bg.png",
          fallback: "",
          width: 1200,
          height: 1200,
        },
      }),
      fact({
        entity: "page",
        attribute: "theme/card-background-image-repeat",
        data: { type: "number", value: 320.7 },
      }),
      fact({
        entity: "page",
        attribute: "theme/card-background-image-opacity",
        data: { type: "number", value: 0.5 },
      }),
    ];
    let uploaded: string[] = [];
    let { pages } = await processBlocksToPages({
      facts,
      root_entity: "root",
      hooks: {
        uploadImage: async (src) => {
          uploaded.push(src);
          return { ref: { $link: src } } as any;
        },
        uploadPoll: null,
      },
    });
    expect(uploaded).toEqual(["https://example.com/bg.png"]);
    expect(pages[0]).toMatchObject({
      $type: "pub.leaflet.pages.canvas",
      pattern: "plain",
      background: {
        $type: "pub.leaflet.pages.canvas#background",
        image: { ref: { $link: "https://example.com/bg.png" } },
        width: 320,
        opacity: 50,
      },
    });
  });

  it("publishes an embedded canvas as a block referencing its sized canvas page", async () => {
    let facts = [
      fact({
        entity: "root",
        attribute: "root/page",
        data: { type: "ordered-reference", value: "page", position: "a0" },
      }),
      child("page", "embedded-canvas", "a0"),
      block("embedded-canvas", "embedded-canvas"),
      fact({
        entity: "embedded-canvas",
        attribute: "block/card",
        data: { type: "reference", value: "canvasPage" },
      }),
      fact({
        entity: "embedded-canvas",
        attribute: "image/alt",
        data: { type: "string", value: "A sketch of a cat" },
      }),
      fact({
        entity: "canvasPage",
        attribute: "page/type",
        data: { type: "page-type-union", value: "canvas" },
      }),
      fact({
        entity: "canvasPage",
        attribute: "canvas/fixed-width",
        data: { type: "number", value: 624 },
      }),
      fact({
        entity: "canvasPage",
        attribute: "canvas/fixed-height",
        data: { type: "number", value: 240.5 },
      }),
    ];
    let { pages } = await processBlocksToPages({
      facts,
      root_entity: "root",
      hooks: { uploadImage: async () => undefined, uploadPoll: null },
    });
    expect(pages.map((p) => p.id)).toEqual(["page", "canvasPage"]);
    expect(pages[0].blocks[0].block).toEqual({
      $type: "pub.leaflet.blocks.embeddedCanvas",
      id: "canvasPage",
      alt: "A sketch of a cat",
    });
    expect(pages[1]).toMatchObject({
      $type: "pub.leaflet.pages.canvas",
      width: 624,
      height: 240,
      blocks: [],
    });
  });

  it("publishes a canvas group as a linear document canvas block", async () => {
    let facts = [
      fact({
        entity: "root",
        attribute: "root/page",
        data: { type: "ordered-reference", value: "page", position: "a0" },
      }),
      fact({
        entity: "page",
        attribute: "page/type",
        data: { type: "page-type-union", value: "canvas" },
      }),
      fact({
        entity: "page",
        attribute: "canvas/block",
        data: {
          type: "spatial-reference",
          value: "group",
          position: { x: 10.4, y: 20.6 },
        },
      }),
      block("group", "group"),
      fact({
        entity: "group",
        attribute: "canvas/block/width",
        data: { type: "number", value: 400 },
      }),
      child("group", "second", "a1"),
      child("group", "first", "a0"),
      block("first", "heading"),
      block("second", "horizontal-rule"),
      fact({
        entity: "page",
        attribute: "canvas/block",
        data: {
          type: "spatial-reference",
          value: "empty",
          position: { x: 0, y: 0 },
        },
      }),
      block("empty", "group"),
    ];
    let { pages } = await processBlocksToPages({
      facts,
      root_entity: "root",
      hooks: { uploadImage: async () => undefined, uploadPoll: null },
    });
    expect(pages).toHaveLength(1);
    expect(pages[0].$type).toBe("pub.leaflet.pages.canvas");
    expect(pages[0].blocks).toEqual([
      {
        $type: "pub.leaflet.pages.canvas#block",
        x: 10,
        y: 20,
        width: 400,
        block: {
          $type: "pub.leaflet.pages.linearDocument",
          blocks: [
            expect.objectContaining({
              block: expect.objectContaining({
                $type: "pub.leaflet.blocks.header",
              }),
            }),
            expect.objectContaining({
              block: { $type: "pub.leaflet.blocks.horizontalRule" },
            }),
          ],
        },
      },
    ]);
  });

  it("publishes the alignment of a lone canvas text block", async () => {
    let canvasBlock = (value: string, x: number) =>
      fact({
        entity: "page",
        attribute: "canvas/block",
        data: { type: "spatial-reference", value, position: { x, y: 0 } },
      });
    let aligned = (entity: string) =>
      fact({
        entity,
        attribute: "block/text-alignment",
        data: { type: "text-alignment-type-union", value: "center" },
      });
    let facts = [
      fact({
        entity: "root",
        attribute: "root/page",
        data: { type: "ordered-reference", value: "page", position: "a0" },
      }),
      fact({
        entity: "page",
        attribute: "page/type",
        data: { type: "page-type-union", value: "canvas" },
      }),
      canvasBlock("heading", 0),
      block("heading", "heading"),
      aligned("heading"),
      canvasBlock("rule", 100),
      block("rule", "horizontal-rule"),
      aligned("rule"),
    ];
    let { pages } = await processBlocksToPages({
      facts,
      root_entity: "root",
      hooks: { uploadImage: async () => undefined, uploadPoll: null },
    });
    expect(pages[0].blocks).toEqual([
      expect.objectContaining({
        block: expect.objectContaining({ $type: "pub.leaflet.blocks.header" }),
        alignment: "lex:pub.leaflet.pages.linearDocument#textAlignCenter",
      }),
      expect.not.objectContaining({ alignment: expect.anything() }),
    ]);
  });
});
