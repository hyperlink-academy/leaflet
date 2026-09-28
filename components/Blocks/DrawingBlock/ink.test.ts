import { describe, expect, it } from "vitest";
import { lexicons } from "lexicons/api/lexicons";
import {
  DrawingLayout,
  canvasToDrawing,
  drawingToCanvas,
  inkColor,
  inkSamples,
  inkStrokePath,
  refitLayout,
  simplifySamples,
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

  it("resamples evenly and smooths pressure jitter", () => {
    let points: number[] = [];
    for (let i = 0; i <= 200; i++) points.push(i * 0.3, 0, i % 4 ? 0.2 : 0.8);
    let samples = inkSamples(points, 8, true);
    for (let i = 1; i < samples.length - 1; i++)
      expect(samples[i][0] - samples[i - 1][0]).toBeCloseTo(2);
    let middle = samples.slice(8, -8).map((s) => s[2]);
    expect(Math.max(...middle) - Math.min(...middle)).toBeLessThan(0.05);
  });

  it("simplifies straight runs but keeps corners and pressure ramps", () => {
    let line = inkSamples([0, 0, 0.5, 100, 0, 0.5], 4, true);
    expect(simplifySamples(line, 0.5, 0.03)).toHaveLength(2);
    let corner = inkSamples([0, 0, 0.5, 50, 0, 0.5, 50, 50, 0.5], 4, true);
    expect(simplifySamples(corner, 0.5, 0.03).map((s) => [s[0], s[1]])).toEqual(
      [
        [0, 0],
        [50, 0],
        [50, 50],
      ],
    );
    let ramp = inkSamples([0, 0, 0.1, 50, 0, 0.9, 100, 0, 0.1], 4, false);
    expect(simplifySamples(ramp, 0.5, 0.03)).toHaveLength(3);
  });

  it("only passes through theme tokens and hex colors", () => {
    expect(inkColor("primary")).toBe("rgb(var(--primary))");
    expect(inkColor("tertiary")).toContain("color-mix");
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
