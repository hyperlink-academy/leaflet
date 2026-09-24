import { useEffect, useRef, useState } from "react";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  getCanvasZoom,
  isCanvasPinching,
} from "src/canvasZoom/CanvasZoomProvider";
import { CANVAS_DRAG_STACK_ORDER } from "src/utils/canvasBlockOrder";
import {
  INK_PRESSURE_SCALE,
  InkStroke,
  canvasToDrawing,
  drawingScale,
  strokeHit,
} from "./ink";
import { InkPath } from "./InkSvg";
import { useInkSession } from "./useInkSession";
import {
  DrawingState,
  commitStroke,
  eraseStrokes,
  readDrawing,
  stopInk,
} from "./inkMutations";

// Canvas px around the eraser's point that sweeps a stroke away.
const ERASER_RADIUS = 8;
// The eraser end of a stylus reports this in PointerEvent.buttons.
const PEN_ERASER_BUTTONS = 32;

const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="white" fill-opacity="0.6" stroke="black" stroke-width="1.5"/></svg>`,
)}") 10 10, crosshair`;

type Gesture = {
  pointerId: number;
  erase: boolean;
  // Canvas px, flattened x, y, pressure (0-1) triples.
  points: number[];
  simulatePressure: boolean;
  drawing: Promise<DrawingState | null> | null;
  erased: Set<string>;
};

// Captures pen, mouse and touch input over the whole canvas while the page is
// in draw mode. Pinches still reach the canvas zoom, and once a stylus has
// been used, a finger pans instead of drawing.
export function CanvasInkLayer(props: { pageID: string }) {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let tool = useInkSession((s) => s.tool);
  let color = useInkSession((s) => s.color);
  let size = useInkSession((s) => s.size);
  let ref = useRef<HTMLDivElement>(null);
  let gesture = useRef<Gesture | null>(null);
  let touches = useRef(new Set<number>());
  let [penSeen, setPenSeen] = useState(false);
  let [live, setLive] = useState<InkStroke | null>(null);
  // Finished strokes shown here until the drawing block renders them.
  let [pending, setPending] = useState<{ key: number; stroke: InkStroke }[]>(
    [],
  );
  let pendingKey = useRef(0);

  useEffect(() => {
    let onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopInk(rep, undoManager);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rep, undoManager]);

  let toCanvas = (e: { clientX: number; clientY: number }) => {
    let rect = ref.current!.getBoundingClientRect();
    let zoom = getCanvasZoom(props.pageID);
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  let eraseAt = async (g: Gesture, p: { x: number; y: number }) => {
    let drawing = await g.drawing;
    if (!drawing || gesture.current !== g) return;
    let d = canvasToDrawing(drawing.layout, p);
    let radius = ERASER_RADIUS / drawingScale(drawing.layout);
    let hit = false;
    for (let s of drawing.strokes) {
      if (g.erased.has(s.id) || !strokeHit(s.stroke, d, radius)) continue;
      g.erased.add(s.id);
      hit = true;
    }
    if (hit) useInkSession.getState().setErasing([...g.erased]);
  };

  let addPoints = (g: Gesture, e: React.PointerEvent) => {
    let events = e.nativeEvent.getCoalescedEvents?.() || [];
    if (events.length === 0) events = [e.nativeEvent];
    for (let ev of events) {
      let p = toCanvas(ev);
      if (g.erase) {
        eraseAt(g, p);
        continue;
      }
      let pressure =
        ev.pointerType === "pen" && ev.pressure > 0 ? ev.pressure : 0.5;
      g.points.push(p.x, p.y, pressure);
    }
    if (!g.erase) setLive(liveStroke(g));
  };

  let liveStroke = (g: Gesture): InkStroke => ({
    points: g.points.map((v, i) => (i % 3 === 2 ? v * INK_PRESSURE_SCALE : v)),
    color,
    size,
    simulatePressure: g.simulatePressure,
  });

  let cancel = () => {
    gesture.current = null;
    setLive(null);
    useInkSession.getState().setErasing([]);
  };

  let finish = (e: React.PointerEvent) => {
    let g = gesture.current;
    if (!g || g.pointerId !== e.pointerId || !rep) return;
    gesture.current = null;
    if (g.erase) {
      let target = useInkSession.getState().target;
      if (!target || g.erased.size === 0) return;
      eraseStrokes(rep, undoManager, {
        page: props.pageID,
        target,
        strokeIDs: [...g.erased],
      }).then(() => useInkSession.getState().setErasing([]));
      return;
    }
    let key = pendingKey.current++;
    setLive(null);
    setPending((p) => [...p, { key, stroke: liveStroke(g) }]);
    commitStroke(rep, undoManager, {
      page: props.pageID,
      permission_set: entity_set.set,
      canvasPoints: g.points,
      color,
      size,
      simulatePressure: g.simulatePressure,
    }).finally(() =>
      requestAnimationFrame(() =>
        setPending((p) => p.filter((s) => s.key !== key)),
      ),
    );
  };

  return (
    <div
      ref={ref}
      className="canvasInkLayer absolute inset-0"
      style={{
        zIndex: CANVAS_DRAG_STACK_ORDER + 1,
        touchAction: penSeen ? "pan-x pan-y" : "none",
        cursor: tool === "eraser" ? ERASER_CURSOR : "crosshair",
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          touches.current.add(e.pointerId);
          // A second finger is a pinch, not a stroke.
          if (touches.current.size > 1) return cancel();
          if (penSeen) return;
        }
        if (e.pointerType === "pen" && !penSeen) setPenSeen(true);
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (isCanvasPinching()) return;
        e.preventDefault();
        ref.current?.setPointerCapture(e.pointerId);
        let erase =
          tool === "eraser" ||
          (e.pointerType === "pen" && !!(e.buttons & PEN_ERASER_BUTTONS));
        let target = useInkSession.getState().target;
        gesture.current = {
          pointerId: e.pointerId,
          erase,
          points: [],
          simulatePressure: e.pointerType !== "pen",
          drawing:
            erase && rep && target
              ? readDrawing(rep, props.pageID, target)
              : null,
          erased: new Set(),
        };
        addPoints(gesture.current, e);
      }}
      onPointerMove={(e) => {
        let g = gesture.current;
        if (g && g.pointerId === e.pointerId) addPoints(g, e);
      }}
      onPointerUp={(e) => {
        touches.current.delete(e.pointerId);
        finish(e);
      }}
      onPointerCancel={(e) => {
        touches.current.delete(e.pointerId);
        if (gesture.current?.pointerId === e.pointerId) cancel();
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {pending.map((p) => (
          <InkPath key={p.key} stroke={p.stroke} />
        ))}
        {live && <InkPath stroke={live} live />}
      </svg>
    </div>
  );
}
