import { getStroke } from "perfect-freehand";

export type InkStroke = {
  points: readonly number[];
  color: string;
  size: number;
  simulatePressure?: boolean;
};
export type ViewBox = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

// Drawing space is stored as integers (records have no floats), so a new
// drawing's space is finer than canvas px to keep sub-pixel pen detail.
export const INK_UNITS_PER_PX = 4;
export const INK_PRESSURE_SCALE = 1000;
// CanvasBlock's p-3, which the published canvas block frame mirrors.
export const DRAWING_PADDING = 12;

// Sizes are canvas px, so a stroke looks the same weight at any zoom.
export const INK_SIZES = [2, 4, 8] as const;

// Theme colors, resolved against whichever theme renders the drawing. The
// mixes mirror the tertiary and border-light tokens in app/globals.css.
const THEME_INK: Record<string, string> = {
  primary: "rgb(var(--primary))",
  tertiary: "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-page)) 55%)",
  accent: "rgb(var(--accent-1))",
  "border-light":
    "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-page)) 85%)",
};

export const INK_COLORS: { value: string; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "tertiary", label: "Tertiary" },
  { value: "accent", label: "Accent" },
  { value: "border-light", label: "Light" },
];

export function inkColor(color: string) {
  if (Object.prototype.hasOwnProperty.call(THEME_INK, color))
    return THEME_INK[color];
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  return "currentColor";
}

export function inkStrokePath(stroke: InkStroke, last = true) {
  let input: [number, number, number][] = [];
  let p = stroke.points;
  for (let i = 0; i + 2 < p.length; i += 3)
    input.push([p[i], p[i + 1], p[i + 2] / INK_PRESSURE_SCALE]);
  let outline = getStroke(input, {
    size: stroke.size,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: !!stroke.simulatePressure,
    last,
  });
  return svgPathFromOutline(outline);
}

// Quadratic curves through the outline's midpoints, per perfect-freehand's
// recommended renderer.
function svgPathFromOutline(points: number[][]) {
  let len = points.length;
  if (len < 4) return "";
  let avg = (a: number, b: number) => ((a + b) / 2).toFixed(2);
  let [a, b, c] = points;
  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${avg(b[0], c[0])},${avg(b[1], c[1])} T`;
  for (let i = 2; i < len - 1; i++) {
    result += `${avg(points[i][0], points[i + 1][0])},${avg(points[i][1], points[i + 1][1])} `;
  }
  return result + "Z";
}

export function strokeBounds(stroke: InkStroke): ViewBox | null {
  let p = stroke.points;
  if (p.length < 3) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i + 2 < p.length; i += 3) {
    minX = Math.min(minX, p[i]);
    maxX = Math.max(maxX, p[i]);
    minY = Math.min(minY, p[i + 1]);
    maxY = Math.max(maxY, p[i + 1]);
  }
  let margin = Math.ceil(stroke.size / 2) + 1;
  return {
    x: Math.floor(minX - margin),
    y: Math.floor(minY - margin),
    width: Math.ceil(maxX - minX + 2 * margin),
    height: Math.ceil(maxY - minY + 2 * margin),
  };
}

export function unionBounds(boxes: (ViewBox | null)[]): ViewBox | null {
  let result: ViewBox | null = null;
  for (let b of boxes) {
    if (!b) continue;
    if (!result) {
      result = { ...b };
      continue;
    }
    let x = Math.min(result.x, b.x);
    let y = Math.min(result.y, b.y);
    result = {
      x,
      y,
      width: Math.max(result.x + result.width, b.x + b.width) - x,
      height: Math.max(result.y + result.height, b.y + b.height) - y,
    };
  }
  return result;
}

export function sameBox(a: ViewBox, b: ViewBox) {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

// Where a drawing sits on its canvas: the canvas block's frame (position,
// width, rotation about its center) and the view box fitted inside its
// padding.
export type DrawingLayout = {
  position: Point;
  width: number;
  rotation: number;
  viewBox: ViewBox;
};

// Canvas px per drawing unit.
export function drawingScale(l: DrawingLayout) {
  return (l.width - 2 * DRAWING_PADDING) / l.viewBox.width;
}

function frameHeight(l: DrawingLayout) {
  return drawingScale(l) * l.viewBox.height + 2 * DRAWING_PADDING;
}

function rotate(p: Point, degrees: number): Point {
  let r = (degrees * Math.PI) / 180;
  let cos = Math.cos(r),
    sin = Math.sin(r);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

export function drawingToCanvas(l: DrawingLayout, d: Point): Point {
  let s = drawingScale(l);
  let w = l.width,
    h = frameHeight(l);
  let r = rotate(
    {
      x: DRAWING_PADDING + s * (d.x - l.viewBox.x) - w / 2,
      y: DRAWING_PADDING + s * (d.y - l.viewBox.y) - h / 2,
    },
    l.rotation,
  );
  return { x: l.position.x + w / 2 + r.x, y: l.position.y + h / 2 + r.y };
}

// The frame's top-right corner on the canvas, following its rotation.
export function frameTopRight(l: DrawingLayout): Point {
  let w = l.width,
    h = frameHeight(l);
  let r = rotate({ x: w / 2, y: -h / 2 }, l.rotation);
  return { x: l.position.x + w / 2 + r.x, y: l.position.y + h / 2 + r.y };
}

export function canvasToDrawing(l: DrawingLayout, c: Point): Point {
  let s = drawingScale(l);
  let w = l.width,
    h = frameHeight(l);
  let r = rotate(
    { x: c.x - l.position.x - w / 2, y: c.y - l.position.y - h / 2 },
    -l.rotation,
  );
  return {
    x: l.viewBox.x + (r.x + w / 2 - DRAWING_PADDING) / s,
    y: l.viewBox.y + (r.y + h / 2 - DRAWING_PADDING) / s,
  };
}

// Grows or shrinks the frame to a new view box at the same scale and
// rotation, moving it so the strokes already drawn stay where they are on
// the canvas.
export function refitLayout(l: DrawingLayout, viewBox: ViewBox): DrawingLayout {
  let next: DrawingLayout = {
    ...l,
    viewBox,
    width: drawingScale(l) * viewBox.width + 2 * DRAWING_PADDING,
    position: { x: 0, y: 0 },
  };
  let anchor = { x: l.viewBox.x, y: l.viewBox.y };
  let want = drawingToCanvas(l, anchor);
  let got = drawingToCanvas(next, anchor);
  next.position = { x: want.x - got.x, y: want.y - got.y };
  return next;
}

function distanceToSegment(p: Point, a: Point, b: Point) {
  let dx = b.x - a.x,
    dy = b.y - a.y;
  let lengthSq = dx * dx + dy * dy;
  let t =
    lengthSq === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
        );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Both p and radius are in drawing units.
export function strokeHit(stroke: InkStroke, p: Point, radius: number) {
  let pts = stroke.points;
  let reach = radius + stroke.size / 2;
  for (let i = 0; i + 2 < pts.length; i += 3) {
    let a = { x: pts[i], y: pts[i + 1] };
    let b =
      i + 5 < pts.length
        ? { x: pts[i + 3], y: pts[i + 4] }
        : { x: a.x, y: a.y };
    if (distanceToSegment(p, a, b) <= reach) return true;
  }
  return false;
}
