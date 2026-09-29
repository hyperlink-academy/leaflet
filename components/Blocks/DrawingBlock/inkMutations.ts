import { v7 } from "uuid";
import type { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import type { UndoManager } from "src/undoManager";
import { useUIState } from "src/useUIState";
import {
  DRAWING_PADDING,
  DrawingLayout,
  INK_PRESSURE_SCALE,
  INK_UNITS_PER_PX,
  InkStroke,
  canvasToDrawing,
  drawingScale,
  inkSamples,
  loopAt,
  refitLayout,
  sameBox,
  simplifySamples,
  strokeBounds,
  unionBounds,
} from "./ink";
import { useInkSession } from "./useInkSession";

type Rep = Replicache<ReplicacheMutators>;

export type DrawingState = {
  layout: DrawingLayout;
  positionFactID: string;
  strokes: { id: string; stroke: InkStroke }[];
};

export async function readDrawing(
  rep: Rep,
  page: string,
  entity: string,
): Promise<DrawingState | null> {
  return rep.query(async (tx) => {
    let scan = scanIndex(tx);
    let placed = (await scan.eav(page, "canvas/block")).find(
      (f) => f.data.value === entity,
    );
    let [viewBox] = await scan.eav(entity, "drawing/view-box");
    if (!placed || !viewBox) return null;
    let [width] = await scan.eav(entity, "canvas/block/width");
    let [rotation] = await scan.eav(entity, "canvas/block/rotation");
    let strokes = await scan.eav(entity, "drawing/stroke");
    return {
      positionFactID: placed.id,
      layout: {
        position: placed.data.position,
        width: width?.data.value || 360,
        rotation: Math.round(rotation?.data.value || 0),
        viewBox: viewBox.data.value,
      },
      strokes: strokes.map((s) => ({ id: s.id, stroke: s.data.value })),
    };
  });
}

// Drawings placed directly on the page, the session's target first.
async function readDrawings(rep: Rep, page: string) {
  let target = useInkSession.getState().target;
  let entities = await rep.query(async (tx) => {
    let scan = scanIndex(tx);
    let drawings: string[] = [];
    for (let placed of await scan.eav(page, "canvas/block")) {
      let [type] = await scan.eav(placed.data.value, "block/type");
      if (type?.data.value === "drawing") drawings.push(placed.data.value);
    }
    return drawings;
  });
  entities.sort((a, b) => Number(b === target) - Number(a === target));
  let drawings: (DrawingState & { entity: string })[] = [];
  for (let entity of entities) {
    let drawing = await readDrawing(rep, page, entity);
    if (drawing) drawings.push({ ...drawing, entity });
  }
  return drawings;
}

// Fills the closed stroke around a canvas point, if there is one.
export async function fillAt(
  rep: Rep,
  undoManager: UndoManager,
  args: { page: string; point: { x: number; y: number }; color: string },
) {
  for (let drawing of await readDrawings(rep, args.page)) {
    let hit = loopAt(
      drawing.strokes,
      canvasToDrawing(drawing.layout, args.point),
    );
    if (!hit) continue;
    let { id, stroke } = hit.stroke;
    if (stroke.fill?.color === args.color) return;
    await undoManager.withUndoGroup(() =>
      rep.mutate.assertFact({
        id,
        entity: drawing.entity,
        attribute: "drawing/stroke",
        data: {
          type: "ink-stroke",
          value: {
            ...stroke,
            points: [...stroke.points],
            fill: { points: hit.loop, color: args.color },
          },
        },
      }),
    );
    return;
  }
}

// Canvas px the stored points may stray from the drawn stroke.
const SIMPLIFY_TOLERANCE_PX = 0.25;
const SIMPLIFY_PRESSURE_TOLERANCE = 0.03;

// Canvas px points (x, y, pressure 0-1 triples) in, drawing-space stroke out.
function toStroke(
  canvasPoints: number[],
  layout: DrawingLayout,
  args: { color: string; size: number; simulatePressure: boolean },
): Omit<InkStroke, "fill"> & { points: number[] } {
  let scale = drawingScale(layout);
  let size = args.size / scale;
  let drawn: number[] = [];
  for (let i = 0; i + 2 < canvasPoints.length; i += 3) {
    let d = canvasToDrawing(layout, {
      x: canvasPoints[i],
      y: canvasPoints[i + 1],
    });
    drawn.push(d.x, d.y, canvasPoints[i + 2]);
  }
  let samples = simplifySamples(
    inkSamples(drawn, size, !args.simulatePressure),
    SIMPLIFY_TOLERANCE_PX / scale,
    SIMPLIFY_PRESSURE_TOLERANCE,
  );
  let points: number[] = [];
  for (let [dx, dy, pressure] of samples) {
    let x = Math.round(dx),
      y = Math.round(dy);
    let n = points.length;
    if (n >= 3 && points[n - 3] === x && points[n - 2] === y) continue;
    points.push(x, y, Math.round(pressure * INK_PRESSURE_SCALE));
  }
  return {
    points,
    color: args.color,
    size: Math.max(1, Math.round(size)),
    ...(args.simulatePressure && { simulatePressure: true }),
  };
}

// A new drawing's frame: drawing units are INK_UNITS_PER_PX per canvas px, with
// the origin at canvas (0, 0).
const NEW_DRAWING: DrawingLayout = {
  position: { x: -DRAWING_PADDING, y: -DRAWING_PADDING },
  width: 2 * DRAWING_PADDING + 1,
  rotation: 0,
  viewBox: { x: 0, y: 0, width: INK_UNITS_PER_PX, height: INK_UNITS_PER_PX },
};

async function writeLayout(
  rep: Rep,
  page: string,
  entity: string,
  positionFactID: string,
  layout: DrawingLayout,
) {
  await rep.mutate.assertFact([
    {
      entity,
      attribute: "drawing/view-box",
      data: { type: "view-box", value: layout.viewBox },
    },
    {
      entity,
      attribute: "canvas/block/width",
      data: { type: "number", value: layout.width },
    },
    {
      id: positionFactID,
      entity: page,
      attribute: "canvas/block",
      data: {
        type: "spatial-reference",
        value: entity,
        position: layout.position,
      },
    },
  ]);
}

export async function commitStroke(
  rep: Rep,
  undoManager: UndoManager,
  args: {
    page: string;
    permission_set: string;
    canvasPoints: number[];
    color: string;
    // Canvas px.
    size: number;
    simulatePressure: boolean;
  },
) {
  let target = useInkSession.getState().target;
  let existing = target ? await readDrawing(rep, args.page, target) : null;
  let layout = existing?.layout ?? NEW_DRAWING;
  let stroke = toStroke(args.canvasPoints, layout, args);
  let bounds = strokeBounds(stroke);
  if (!bounds) return;
  await undoManager.withUndoGroup(async () => {
    if (target && existing) {
      await rep.mutate.assertFact({
        id: v7(),
        entity: target,
        attribute: "drawing/stroke",
        data: { type: "ink-stroke", value: stroke },
      });
      let viewBox = unionBounds([layout.viewBox, bounds])!;
      if (!sameBox(viewBox, layout.viewBox))
        await writeLayout(
          rep,
          args.page,
          target,
          existing.positionFactID,
          refitLayout(layout, viewBox),
        );
      return;
    }
    let entity = v7();
    let { position, width } = refitLayout(layout, bounds);
    await rep.mutate.addCanvasBlock({
      parent: args.page,
      permission_set: args.permission_set,
      factID: v7(),
      newEntityID: entity,
      type: "drawing",
      position,
      width,
    });
    await rep.mutate.assertFact([
      {
        entity,
        attribute: "drawing/view-box",
        data: { type: "view-box", value: bounds },
      },
      {
        id: v7(),
        entity,
        attribute: "drawing/stroke",
        data: { type: "ink-stroke", value: stroke },
      },
    ]);
    useInkSession.setState({ target: entity });
  });
}

export async function eraseStrokes(
  rep: Rep,
  undoManager: UndoManager,
  args: { page: string; target: string; strokeIDs: string[] },
) {
  let existing = await readDrawing(rep, args.page, args.target);
  if (!existing) return;
  let remaining = existing.strokes.filter(
    (s) => !args.strokeIDs.includes(s.id),
  );
  await undoManager.withUndoGroup(async () => {
    for (let factID of args.strokeIDs) await rep.mutate.retractFact({ factID });
    let viewBox = unionBounds(remaining.map((s) => strokeBounds(s.stroke)));
    if (viewBox && !sameBox(viewBox, existing.layout.viewBox))
      await writeLayout(
        rep,
        args.page,
        args.target,
        existing.positionFactID,
        refitLayout(existing.layout, viewBox),
      );
  });
}

// Leaves draw mode with the drawing selected, or removes it if every stroke
// was erased.
export async function stopInk(rep: Rep | null, undoManager: UndoManager) {
  let { page, target } = useInkSession.getState();
  useInkSession.setState({ page: null, target: null, erasing: [] });
  if (!rep || !page || !target) return;
  let drawing = await readDrawing(rep, page, target);
  if (!drawing) return;
  if (drawing.strokes.length === 0) {
    await undoManager.withUndoGroup(() =>
      rep.mutate.removeBlock({ blockEntity: target, parent: page }),
    );
    return;
  }
  let ui = useUIState.getState();
  ui.setSelectedBlocks([{ entityID: target, parent: page }]);
  ui.setFocusedBlock({ entityType: "block", entityID: target, parent: page });
}
