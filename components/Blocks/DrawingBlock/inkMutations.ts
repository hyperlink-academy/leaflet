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
  refitLayout,
  sameBox,
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

// Canvas px points (x, y, pressure 0-1 triples) in, drawing-space stroke out.
function toStroke(
  canvasPoints: number[],
  toDrawing: (p: { x: number; y: number }) => { x: number; y: number },
  args: { color: string; size: number; simulatePressure: boolean },
): InkStroke & { points: number[] } {
  let points: number[] = [];
  for (let i = 0; i + 2 < canvasPoints.length; i += 3) {
    let d = toDrawing({ x: canvasPoints[i], y: canvasPoints[i + 1] });
    let x = Math.round(d.x),
      y = Math.round(d.y);
    let n = points.length;
    // Rounding folds near points together; repeats only bloat the record.
    if (n >= 3 && points[n - 3] === x && points[n - 2] === y) continue;
    points.push(x, y, Math.round(canvasPoints[i + 2] * INK_PRESSURE_SCALE));
  }
  return {
    points,
    color: args.color,
    size: Math.max(1, Math.round(args.size)),
    ...(args.simulatePressure && { simulatePressure: true }),
  };
}

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
  await undoManager.withUndoGroup(async () => {
    if (!target || !existing) {
      let stroke = toStroke(
        args.canvasPoints,
        (p) => ({ x: p.x * INK_UNITS_PER_PX, y: p.y * INK_UNITS_PER_PX }),
        { ...args, size: args.size * INK_UNITS_PER_PX },
      );
      let viewBox = strokeBounds(stroke);
      if (!viewBox) return;
      let entity = v7();
      await rep.mutate.addCanvasBlock({
        parent: args.page,
        permission_set: args.permission_set,
        factID: v7(),
        newEntityID: entity,
        type: "drawing",
        position: {
          x: viewBox.x / INK_UNITS_PER_PX - DRAWING_PADDING,
          y: viewBox.y / INK_UNITS_PER_PX - DRAWING_PADDING,
        },
        width: viewBox.width / INK_UNITS_PER_PX + 2 * DRAWING_PADDING,
      });
      await rep.mutate.assertFact([
        {
          entity,
          attribute: "drawing/view-box",
          data: { type: "view-box", value: viewBox },
        },
        {
          id: v7(),
          entity,
          attribute: "drawing/stroke",
          data: { type: "ink-stroke", value: stroke },
        },
      ]);
      useInkSession.getState().setTarget(entity);
      return;
    }
    let { layout } = existing;
    let stroke = toStroke(
      args.canvasPoints,
      (p) => canvasToDrawing(layout, p),
      { ...args, size: args.size / drawingScale(layout) },
    );
    let bounds = strokeBounds(stroke);
    if (!bounds) return;
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
  });
}

export async function eraseStrokes(
  rep: Rep,
  undoManager: UndoManager,
  args: { page: string; target: string; strokeIDs: string[] },
) {
  let existing = await readDrawing(rep, args.page, args.target);
  if (!existing || args.strokeIDs.length === 0) return;
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

export async function startInk(rep: Rep | null, page: string, target: string) {
  useInkSession.getState().start(page, target);
  let snapshot = rep ? await readDrawing(rep, page, target) : null;
  let session = useInkSession.getState();
  if (snapshot && session.page === page && session.target === target)
    session.setSnapshot(snapshot);
}

// Leaves draw mode undoing the session: strokes drawn are retracted, strokes
// erased come back and the frame returns to where it was. A drawing the
// session created is removed.
export async function cancelInk(rep: Rep | null, undoManager: UndoManager) {
  let { page, target, snapshot } = useInkSession.getState();
  useInkSession.setState({
    page: null,
    target: null,
    erasing: [],
    snapshot: null,
  });
  if (!rep || !page || !target) return;
  let current = await readDrawing(rep, page, target);
  if (!current) return;
  await undoManager.withUndoGroup(async () => {
    if (!snapshot) {
      await rep.mutate.removeBlock({ blockEntity: target, parent: page });
      return;
    }
    let before = new Set(snapshot.strokes.map((s) => s.id));
    let now = new Set(current.strokes.map((s) => s.id));
    for (let s of current.strokes)
      if (!before.has(s.id)) await rep.mutate.retractFact({ factID: s.id });
    let restore = snapshot.strokes.filter((s) => !now.has(s.id));
    if (restore.length > 0)
      await rep.mutate.assertFact(
        restore.map((s) => ({
          id: s.id,
          entity: target,
          attribute: "drawing/stroke" as const,
          data: {
            type: "ink-stroke" as const,
            value: { ...s.stroke, points: [...s.stroke.points] },
          },
        })),
      );
    await writeLayout(
      rep,
      page,
      target,
      current.positionFactID,
      snapshot.layout,
    );
  });
}

// Leaves draw mode with the drawing selected, or removes it if every stroke
// was erased.
export async function stopInk(rep: Rep | null, undoManager: UndoManager) {
  let { page, target } = useInkSession.getState();
  useInkSession.setState({
    page: null,
    target: null,
    erasing: [],
    snapshot: null,
  });
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
