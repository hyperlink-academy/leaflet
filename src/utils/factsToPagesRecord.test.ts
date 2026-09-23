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
});
