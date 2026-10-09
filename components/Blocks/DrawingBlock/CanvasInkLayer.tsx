import { useEffect, useRef, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { CheckTiny } from "components/Icons/CheckTiny";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  isCanvasPinching,
  nearestScroller,
  useCanvasZoom,
  useCanvasZoomEngine,
} from "src/canvasZoom/CanvasZoomProvider";
import { clientToCanvas } from "src/canvasZoom/session";
import { isIOS } from "src/utils/isDevice";
import { CANVAS_DRAG_STACK_ORDER } from "src/utils/canvasBlockOrder";
import {
  INK_PRESSURE_SCALE,
  InkStroke,
  canvasToDrawing,
  drawingScale,
  frameTopRight,
  strokeHit,
} from "./ink";
import { InkPath } from "./InkSvg";
import { InkTool, useInkSession } from "./useInkSession";
import {
  DrawingState,
  commitStroke,
  eraseStrokes,
  fillAt,
  readDrawing,
  stopInk,
} from "./inkMutations";

// Canvas px around the eraser's point that sweeps a stroke away.
const ERASER_RADIUS = 8;
// The eraser end of a stylus reports these in PointerEvent.buttons and
// PointerEvent.button.
const PEN_ERASER_BUTTONS = 32;
const PEN_ERASER_BUTTON = 5;

const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="white" fill-opacity="0.6" stroke="black" stroke-width="1.5"/></svg>`,
)}") 10 10, crosshair`;

type Gesture = {
  pointerId: number;
  // A fill lands where the pointer went down once it lifts, so a pinch's
  // first finger can still cancel it.
  tool: InkTool;
  // Canvas px, flattened x, y, pressure (0 to INK_PRESSURE_SCALE) triples.
  points: number[];
  simulatePressure: boolean;
  drawing: Promise<DrawingState | null> | null;
  erased: Set<string>;
};

type Pan = {
  pointerId: number;
  x: number;
  y: number;
  scrollX: HTMLElement;
  scrollY: HTMLElement;
};

// Captures pen, mouse and touch input over the whole canvas while the page is
// in draw mode. Pinches still reach the canvas zoom, and once a stylus has
// been used, a finger pans instead of drawing.
export function CanvasInkLayer(props: { pageID: string }) {
  let { rep, undoManager } = useReplicache();
  let engine = useCanvasZoomEngine();
  let entity_set = useEntitySetContext();
  let { tool, color, size } = useInkSession();
  let ref = useRef<HTMLDivElement>(null);
  let gesture = useRef<Gesture | null>(null);
  let pan = useRef<Pan | null>(null);
  let touches = useRef(new Set<number>());
  let [penSeen, setPenSeen] = useState(false);
  // Chrome and Firefox apply touch-action to pens as well as fingers, and
  // only WebKit's touchType tells a stylus's touch events apart to cancel
  // them, so elsewhere a pan-friendly touch-action would scroll under the pen
  // and cancel its stroke. There fingers pan by hand instead.
  let nativeFingerPan = penSeen && isIOS();
  let [live, setLive] = useState<InkStroke | null>(null);
  // Finished strokes shown here until the drawing block renders them.
  let [pending, setPending] = useState<{ key: number; stroke: InkStroke }[]>(
    [],
  );
  let pendingKey = useRef(0);

  // On iOS fingers pan natively once a stylus has been seen, so touch-action
  // allows panning for every touch and the pencil would scroll too.
  // Cancelling the stylus's own touch events keeps it drawing.
  useEffect(() => {
    let el = ref.current!;
    let onTouch = (e: TouchEvent) => {
      // touchType is WebKit-only and missing from the DOM types.
      for (let t of Array.from(e.changedTouches))
        if ((t as Touch & { touchType?: string }).touchType === "stylus")
          return e.preventDefault();
    };
    el.addEventListener("touchstart", onTouch, { passive: false });
    el.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useEffect(() => {
    let onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopInk(rep, undoManager);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rep, undoManager]);

  let eraseAt = async (g: Gesture, p: { x: number; y: number }) => {
    let drawing = await g.drawing;
    if (!drawing || gesture.current !== g) return;
    let d = canvasToDrawing(drawing.layout, p);
    let radius = ERASER_RADIUS / drawingScale(drawing.layout);
    let before = g.erased.size;
    for (let s of drawing.strokes)
      if (strokeHit(s.stroke, d, radius)) g.erased.add(s.id);
    if (g.erased.size > before)
      useInkSession.setState({ erasing: [...g.erased] });
  };

  let addPoints = (g: Gesture, e: React.PointerEvent) => {
    // iOS coalesced pen events carry unreliable pressure (tldraw skips them
    // there too), which beads the line.
    let events = isIOS() ? [] : e.nativeEvent.getCoalescedEvents?.() || [];
    if (events.length === 0) events = [e.nativeEvent];
    for (let ev of events) {
      let p = clientToCanvas(ref.current!, props.pageID, ev);
      if (g.tool === "fill" && g.points.length > 0) break;
      if (g.tool === "eraser") {
        eraseAt(g, p);
        continue;
      }
      // A pen sample can report no pressure mid-stroke; reuse the last one
      // rather than jumping to the default.
      let pressure =
        ev.pointerType !== "pen"
          ? 0.5
          : ev.pressure > 0
            ? ev.pressure
            : g.points[g.points.length - 1] / INK_PRESSURE_SCALE || 0.5;
      g.points.push(p.x, p.y, pressure * INK_PRESSURE_SCALE);
    }
    if (g.tool === "pen") setLive(liveStroke(g));
  };

  let liveStroke = (g: Gesture): InkStroke => ({
    points: g.points,
    color,
    size,
    simulatePressure: g.simulatePressure,
  });

  let startPan = (e: React.PointerEvent) => {
    let box = engine.boxRef.current;
    let scrollY = engine.pageScroll ? nearestScroller(box) : box;
    if (!box || !scrollY) return;
    ref.current?.setPointerCapture(e.pointerId);
    pan.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      scrollX: box,
      scrollY,
    };
  };

  let movePan = (p: Pan, e: React.PointerEvent) => {
    if (isCanvasPinching()) return;
    p.scrollX.scrollLeft -= e.clientX - p.x;
    p.scrollY.scrollTop -= e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
  };

  let cancel = () => {
    pan.current = null;
    gesture.current = null;
    setLive(null);
    useInkSession.setState({ erasing: [] });
  };

  let finish = (e: React.PointerEvent) => {
    let g = gesture.current;
    if (!g || g.pointerId !== e.pointerId || !rep) return;
    gesture.current = null;
    if (g.tool === "eraser") {
      let target = useInkSession.getState().target;
      if (!target || g.erased.size === 0) return;
      eraseStrokes(rep, undoManager, {
        page: props.pageID,
        target,
        strokeIDs: [...g.erased],
      }).then(() => useInkSession.setState({ erasing: [] }));
      return;
    }
    if (g.tool === "fill") {
      fillAt(rep, undoManager, {
        page: props.pageID,
        point: { x: g.points[0], y: g.points[1] },
        color,
      });
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
        touchAction: nativeFingerPan ? "pan-x pan-y" : "none",
        cursor: tool === "eraser" ? ERASER_CURSOR : "crosshair",
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          touches.current.add(e.pointerId);
          // A second finger is a pinch, not a stroke.
          if (touches.current.size > 1) return cancel();
        }
        // Radix only dismisses on a touch once its click lands, which a
        // dragged stroke never produces.
        let session = useInkSession.getState();
        if (session.colorPickerOpen) return session.setColorPickerOpen(false);
        if (e.pointerType === "touch" && penSeen) {
          if (!nativeFingerPan) startPan(e);
          return;
        }
        if (e.pointerType === "pen" && !penSeen) setPenSeen(true);
        let penEraser =
          e.pointerType === "pen" &&
          (e.button === PEN_ERASER_BUTTON ||
            !!(e.buttons & PEN_ERASER_BUTTONS));
        // A stylus barrel button or a right click isn't a stroke.
        if (e.button !== 0 && !penEraser) return;
        if (isCanvasPinching()) return;
        e.preventDefault();
        ref.current?.setPointerCapture(e.pointerId);
        let erase = tool === "eraser" || penEraser;
        gesture.current = {
          pointerId: e.pointerId,
          tool: erase ? "eraser" : tool,
          points: [],
          simulatePressure: e.pointerType !== "pen",
          drawing:
            erase && rep && session.target
              ? readDrawing(rep, props.pageID, session.target)
              : null,
          erased: new Set(),
        };
        addPoints(gesture.current, e);
      }}
      onPointerMove={(e) => {
        let p = pan.current;
        if (p && p.pointerId === e.pointerId) return movePan(p, e);
        let g = gesture.current;
        if (g && g.pointerId === e.pointerId) addPoints(g, e);
      }}
      onPointerUp={(e) => {
        touches.current.delete(e.pointerId);
        if (pan.current?.pointerId === e.pointerId) pan.current = null;
        finish(e);
      }}
      onPointerCancel={(e) => {
        touches.current.delete(e.pointerId);
        if (pan.current?.pointerId === e.pointerId) pan.current = null;
        if (gesture.current?.pointerId === e.pointerId) cancel();
      }}
      // A long press with a pen or finger, or a held stylus button, opens the
      // context menu over the drawing.
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {pending.map((p) => (
          <InkPath key={p.key} stroke={p.stroke} />
        ))}
        {live && <InkPath stroke={live} live />}
      </svg>
      <InkSessionControls pageID={props.pageID} />
    </div>
  );
}

// Done, pinned above the drawing's top-right corner and kept the same size on
// screen at any zoom.
function InkSessionControls(props: { pageID: string }) {
  let { rep, undoManager } = useReplicache();
  let { zoom } = useCanvasZoom();
  let target = useInkSession((s) => s.target);
  let placed = useEntity(props.pageID, "canvas/block").find(
    (f) => f.data.value === target,
  );
  let viewBox = useEntity(target, "drawing/view-box")?.data.value;
  let width = useEntity(target, "canvas/block/width")?.data.value || 360;
  let rotation = useEntity(target, "canvas/block/rotation")?.data.value || 0;
  if (!placed || !viewBox) return null;

  let corner = frameTopRight({
    position: placed.data.position,
    width,
    rotation: Math.round(rotation),
    viewBox,
  });
  return (
    <div
      className="inkSessionControls absolute cursor-default"
      style={{
        left: corner.x,
        top: corner.y - 4 / zoom,
        transform: `translate(-100%, -100%) scale(${1 / zoom})`,
        transformOrigin: "bottom right",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        aria-label="Done drawing"
        title="Done"
        onClick={() => stopInk(rep, undoManager)}
        className="block p-1 rounded-full bg-accent-1 border border-accent-1 text-accent-2 shadow-sm"
      >
        <CheckTiny />
      </button>
    </div>
  );
}
