import { describe, expect, test } from "vitest";
import {
  canvasStackingOrder,
  canvasStackOrders,
  type CanvasLayer,
} from "src/utils/canvasBlockOrder";

const block = (x: number, y: number, stackOrder?: string): CanvasLayer => ({
  x,
  y,
  stackOrder,
});

const stacked = (blocks: CanvasLayer[]) =>
  [...blocks].sort(canvasStackingOrder).map((b) => `${b.x},${b.y}`);

describe("canvasStackingOrder", () => {
  test("falls back to position order when nothing is layered", () => {
    expect(
      stacked([block(50, 100), block(10, 0), block(90, 0), block(0, 100)]),
    ).toEqual(["10,0", "90,0", "0,100", "50,100"]);
  });

  test("puts every layered block above every unlayered one", () => {
    expect(stacked([block(0, 500, "a0"), block(0, 0), block(0, 900)])).toEqual([
      "0,0",
      "0,900",
      "0,500",
    ]);
  });

  test("orders layered blocks by their index, ignoring position", () => {
    expect(
      [block(3, 900, "a0"), block(1, 100, "a2"), block(2, 500, "a1")]
        .sort(canvasStackingOrder)
        .map((b) => b.x),
    ).toEqual([3, 2, 1]);
  });
});

describe("canvasStackOrders", () => {
  test("returns stack orders positioned against the input order, not paint order", () => {
    // Reading order: top-left, then the two lower ones. Paint order lifts the
    // layered block (index 2) above the rest.
    let blocks = [block(0, 0), block(10, 100), block(20, 100, "a0")];
    expect(canvasStackOrders(blocks)).toEqual([1, 2, 3]);

    let reordered = [block(20, 100, "a0"), block(0, 0), block(10, 100)];
    expect(canvasStackOrders(reordered)).toEqual([3, 1, 2]);
  });
});
