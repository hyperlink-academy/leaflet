import { describe, expect, it } from "vitest";
import { pageRecordTextBlocks } from "./pageRecordTextBlocks";
import type {
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";

const text = (plaintext: string) => ({
  $type: "pub.leaflet.blocks.text" as const,
  plaintext,
});
const header = (plaintext: string) => ({
  $type: "pub.leaflet.blocks.header" as const,
  plaintext,
});
const linear = (...blocks: unknown[]): PubLeafletPagesLinearDocument.Block[] =>
  blocks.map((block) => ({ block })) as PubLeafletPagesLinearDocument.Block[];

describe("pageRecordTextBlocks", () => {
  it("uses a leading list item as the title", () => {
    let blocks = linear(
      {
        $type: "pub.leaflet.blocks.unorderedList",
        children: [{ content: text("Groceries") }, { content: text("Chores") }],
      },
      text("Later paragraph"),
    );
    expect(
      pageRecordTextBlocks(blocks, { limit: 3 }).map((b) => b.plaintext),
    ).toEqual(["Groceries", "Chores", "Later paragraph"]);
  });

  it("descends nested list children in document order", () => {
    let blocks = linear({
      $type: "pub.leaflet.blocks.orderedList",
      children: [
        {
          content: header("One"),
          unorderedListChildren: {
            $type: "pub.leaflet.blocks.unorderedList",
            children: [{ content: text("One a") }],
          },
        },
        { content: text("Two") },
      ],
    });
    expect(
      pageRecordTextBlocks(blocks, { limit: 3 }).map((b) => b.plaintext),
    ).toEqual(["One", "One a", "Two"]);
  });

  it("skips image list items and stops at the limit", () => {
    let blocks = linear(
      { $type: "pub.leaflet.blocks.image" },
      {
        $type: "pub.leaflet.blocks.unorderedList",
        children: [
          { content: { $type: "pub.leaflet.blocks.image" } },
          { content: text("First") },
        ],
      },
      text("Second"),
    );
    expect(
      pageRecordTextBlocks(blocks, { limit: 1 }).map((b) => b.plaintext),
    ).toEqual(["First"]);
  });

  it("orders canvas blocks top-to-bottom, left-to-right", () => {
    let blocks = [
      { x: 10, y: 50, width: 100, block: text("bottom") },
      { x: 200, y: 0, width: 100, block: text("top right") },
      { x: 0, y: 0, width: 100, block: header("top left") },
    ] as PubLeafletPagesCanvas.Block[];
    expect(
      pageRecordTextBlocks(blocks, { isCanvas: true, limit: 3 }).map(
        (b) => b.plaintext,
      ),
    ).toEqual(["top left", "top right", "bottom"]);
  });
});
