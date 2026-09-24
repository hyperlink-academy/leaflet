import { describe, expect, it } from "vitest";
import { lexicons } from "lexicons/api/lexicons";
import {
  DrawingLayout,
  canvasToDrawing,
  drawingToCanvas,
  inkColor,
  inkStrokePath,
  refitLayout,
  strokeBounds,
  strokeHit,
} from "./ink";

const layout: DrawingLayout = {
  position: { x: 100, y: 50 },
  width: 224,
  rotation: 30,
  viewBox: { x: -40, y: 20, width: 400, height: 300 },
};

const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};

describe("drawing layout", () => {
  it("maps canvas points back to the drawing point they came from", () => {
    let d = { x: 123, y: 87 };
    close(canvasToDrawing(layout, drawingToCanvas(layout, d)), d);
  });

  it("keeps strokes in place on the canvas when the view box grows", () => {
    let next = refitLayout(layout, {
      x: -200,
      y: -10,
      width: 900,
      height: 700,
    });
    for (let d of [
      { x: -40, y: 20 },
      { x: 300, y: 250 },
      { x: 0, y: 0 },
    ])
      close(drawingToCanvas(next, d), drawingToCanvas(layout, d));
    // Same scale: canvas px per drawing unit is unchanged.
    expect((next.width - 24) / 900).toBeCloseTo((layout.width - 24) / 400);
  });
});

describe("strokes", () => {
  let stroke = {
    points: [0, 0, 500, 100, 0, 500, 100, 100, 500],
    color: "#E5484D",
    size: 10,
  };

  it("bounds a stroke with room for its width", () => {
    expect(strokeBounds(stroke)).toEqual({
      x: -6,
      y: -6,
      width: 112,
      height: 112,
    });
  });

  it("hits along a segment, not only at points", () => {
    expect(strokeHit(stroke, { x: 50, y: 3 }, 1)).toBe(true);
    expect(strokeHit(stroke, { x: 50, y: 50 }, 1)).toBe(false);
  });

  it("renders a closed outline path", () => {
    expect(inkStrokePath(stroke)).toMatch(/^M.*Z$/);
  });

  it("only passes through theme tokens and hex colors", () => {
    expect(inkColor("primary")).toBe("rgb(var(--primary))");
    expect(inkColor("border-light")).toContain("color-mix");
    expect(inkColor("constructor")).toBe("currentColor");
    expect(inkColor("#fff")).toBe("#fff");
    expect(inkColor("url(https://example.com)")).toBe("currentColor");
  });
});

describe("drawing lexicon", () => {
  it("accepts a serialized drawing and rejects fractional coordinates", () => {
    let valid = lexicons.validate("pub.leaflet.blocks.drawing", {
      $type: "pub.leaflet.blocks.drawing",
      viewBox: { x: -6, y: -6, width: 112, height: 112 },
      strokes: [
        { points: [0, 0, 500, 100, 0, 500], color: "primary", size: 10 },
      ],
    });
    expect(valid.success).toBe(true);
    let invalid = lexicons.validate("pub.leaflet.blocks.drawing", {
      $type: "pub.leaflet.blocks.drawing",
      viewBox: { x: 0, y: 0, width: 1.5, height: 1 },
      strokes: [],
    });
    expect(invalid.success).toBe(false);
  });
});
