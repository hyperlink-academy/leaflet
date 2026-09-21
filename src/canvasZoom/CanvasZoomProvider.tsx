"use client";
/**
 * Zoom engine for canvas pages. Native scroll stays on the existing scroller;
 * the content is scaled inside it and the scroll offsets are rewritten so the
 * point under the cursor / pinch / viewport center stays put.
 *
 * Usage:
 *
 *   let scrollerRef = useRef<HTMLDivElement>(null);
 *   <div ref={scrollerRef} className="canvasWrapper overflow-y-scroll">
 *     <CanvasZoomProvider pageKey={entityID} scrollerRef={scrollerRef}>
 *       <CanvasZoomControls />          // anywhere inside the provider
 *       <CanvasZoomLayer>
 *         ...the w-[1272px] content div...
 *       </CanvasZoomLayer>
 *     </CanvasZoomProvider>
 *   </div>
 *
 * The provider attaches all gesture listeners to `scrollerRef.current` in an
 * effect, so the scroller must be mounted in the same commit as the provider.
 * It also writes the scroller's inline width to `contentWidth` plus the
 * scrollbar gutter, so a classic (non-overlay) vertical scrollbar does not
 * leave the scroller a few px narrower than the content and scrollable
 * sideways; a `max-width` on the scroller still caps it on narrow screens.
 * Only the direct content of `CanvasZoomLayer` is scaled: overlays that are
 * siblings of the layer inside the scroller (add button, metadata bar) keep
 * their screen size. The layer's spacer has `min-width: 100%` so a `w-fit`
 * scroller does not shrink when zoomed out. The layer is a grid whose
 * min-height tracks the scroller's height in canvas px, so the content it
 * stretches always covers the viewport at any zoom (percentage heights inside
 * the content, e.g. a background, resolve against it).
 *
 * Frames during a gesture touch nothing but the layer's inline transform: the
 * scroll offset the anchor calls for is folded into a translate on top of the
 * scale, so the browser has no style, layout or paint work per frame and the
 * compositor just re-draws the layer's existing raster. Resizing the spacer
 * and writing the real scroll offset (which force a layout, repaint the
 * scroller and scrollbars, and recalc every descendant through the inherited
 * `--canvas-zoom`) happen once, when the gesture settles, with the same
 * on-screen result. A native scroll mid-gesture settles immediately so the
 * content keeps following the scroller.
 *
 * Reading zoom:
 *   - `useCanvasZoom().zoom` is the settled value (React state, committed once
 *     ~200ms after the last gesture event).
 *   Wheel, keyboard and button targets are eased toward per frame
 *   (approachZoom); a pinch target is `immediate` and tracks the fingers.
 *   - `useCanvasZoomRef()` / `getCanvasZoom(pageKey)` return the live value,
 *     for hot paths (drag deltas, drop placement, ProseMirror scrolling).
 *   Client px -> canvas px is `(clientX - layerRect.left) / zoom`; the layer
 *   rect already includes the mid-gesture translate.
 *   - `isCanvasPinching()` is true while two fingers are on the canvas.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  CONTENT_WIDTH,
  MAX_ZOOM,
  type Point,
  anchorToCanvas,
  approachZoom,
  clampZoom,
  minZoom,
  nextStep,
  scrollForAnchor,
} from "./math";
import { getCanvasZoom, hasCanvasZoom, setCanvasZoom } from "./session";
import { useCanvasZoomGestures } from "./useCanvasZoomGestures";

export { getCanvasZoom, isCanvasPinching } from "./session";

const IDLE_MS = 200;

export type ZoomTarget = {
  zoom: number;
  anchorViewport: Point;
  anchorCanvas: Point;
  /** Finger-driven (pinch): shown as is instead of eased toward. */
  immediate?: boolean;
};

type Scroll = { left: number; top: number };

// Scroll geometry captured on a gesture's first frame; `scroll0` is what the
// scroller really sits on while the gesture runs, `pad0` the spacer padding
// the content then sat behind, and `virtual` the offset the anchor asks for
// as if the content began at the scroller's origin: it can be negative or
// beyond the content, and the settle turns that excess into padding.
// settle will write.
type Gesture = {
  scroll0: Scroll;
  pad0: Scroll;
  virtual: Scroll;
  clientWidth: number;
  clientHeight: number;
  contentHeight: number;
};

export type CanvasZoomEngine = {
  scrollerRef: RefObject<HTMLElement | null>;
  layerRef: RefObject<HTMLDivElement | null>;
  spacerRef: RefObject<HTMLDivElement | null>;
  zoomRef: RefObject<number>;
  minRef: RefObject<number>;
  contentWidth: number;
  /** Zoom the next rendered frame will show (pending target or live). */
  targetZoom: () => number;
  /** Viewport-relative point of the scroller's client box. */
  toViewport: (clientX: number, clientY: number) => Point;
  /** Canvas point currently under a viewport-relative point. */
  canvasPointAt: (anchorViewport: Point) => Point;
  clamp: (z: number) => number;
  schedule: (target: ZoomTarget) => void;
  /** Reconciles a running gesture now instead of after the idle delay. */
  settleNow: () => void;
};

type CanvasZoomContextValue = {
  zoom: number;
  min: number;
  max: number;
  /** False until the client has read the on-screen zoom. */
  ready: boolean;
  zoomRef: RefObject<number>;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  setZoom: (zoom: number, anchor?: Point) => void;
};

const CanvasZoomContext = createContext<CanvasZoomContextValue | null>(null);
// Stable for the provider's life, so subscribers (every image block, the
// layer) are not re-rendered by each settle.
const CanvasZoomEngineContext = createContext<CanvasZoomEngine | null>(null);

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function CanvasZoomProvider(props: {
  pageKey: string;
  scrollerRef: RefObject<HTMLElement | null>;
  contentWidth?: number;
  children: ReactNode;
}) {
  let { pageKey, scrollerRef } = props;
  let contentWidth = props.contentWidth ?? CONTENT_WIDTH;
  let layerRef = useRef<HTMLDivElement>(null);
  let spacerRef = useRef<HTMLDivElement>(null);
  let zoomRef = useRef(
    typeof window === "undefined" ? 1 : getCanvasZoom(pageKey),
  );
  let minRef = useRef(0.25);
  let [zoom, setZoomState] = useState(zoomRef.current);
  let [min, setMin] = useState(minRef.current);
  let [ready, setReady] = useState(false);

  let pending = useRef<ZoomTarget | null>(null);
  let gesture = useRef<Gesture | null>(null);
  let writtenScroll = useRef<Scroll | null>(null);
  // Spacer padding on the left/top: empty space a settle left before the
  // content so the anchor could stay put near an edge. Only the engine
  // writes it, so it is tracked here instead of read back from style.
  let pads = useRef<Scroll>({ left: 0, top: 0 });
  let lastFrame = useRef(0);
  let raf = useRef(0);
  let idleTimer = useRef(0);

  let engine = useMemo<CanvasZoomEngine>(() => {
    let beginGesture = (scroller: HTMLElement, spacer: HTMLElement) => {
      let scroll0 = { left: scroller.scrollLeft, top: scroller.scrollTop };
      let g: Gesture = {
        scroll0,
        pad0: { ...pads.current },
        virtual: {
          left: scroll0.left - pads.current.left,
          top: scroll0.top - pads.current.top,
        },
        clientWidth: scroller.clientWidth,
        clientHeight: scroller.clientHeight,
        contentHeight:
          Number(spacer.style.getPropertyValue("--canvas-content-height")) ||
          0,
      };
      gesture.current = g;
      scroller.addEventListener("scroll", onNativeScroll, { once: true });
      return g;
    };

    let settle = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = 0;
      lastFrame.current = 0;
      let g = gesture.current;
      gesture.current = null;
      let scroller = scrollerRef.current;
      let layer = layerRef.current;
      let spacer = spacerRef.current;
      if (g && scroller && layer && spacer) {
        scroller.removeEventListener("scroll", onNativeScroll);
        // Read before the spacer resizes, which can clamp or anchor the
        // offset; the difference is a native scroll made mid-gesture.
        let x = Math.round(g.virtual.left) + scroller.scrollLeft - g.scroll0.left;
        let y = Math.round(g.virtual.top) + scroller.scrollTop - g.scroll0.top;
        let z = zoomRef.current;
        // Padding is exactly the empty space the anchor leaves on each side
        // (none once the content covers the viewport again), so the written
        // offset is always in range and the content never slides to fit.
        let boxWidth = Math.max(contentWidth * z, g.clientWidth);
        let boxHeight = Math.max(g.contentHeight * z, g.clientHeight);
        let pad = {
          left: Math.max(0, -x),
          top: Math.max(0, -y),
          right: Math.max(0, x + g.clientWidth - boxWidth),
          bottom: Math.max(0, y + g.clientHeight - boxHeight),
        };
        pads.current = { left: pad.left, top: pad.top };
        spacer.style.padding = `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`;
        spacer.style.setProperty("--canvas-zoom", String(z));
        layer.style.setProperty("--canvas-zoom", String(z));
        layer.style.transform = "";
        scroller.scrollLeft = x + pad.left;
        scroller.scrollTop = y + pad.top;
        writtenScroll.current = {
          left: scroller.scrollLeft,
          top: scroller.scrollTop,
        };
      }
      setZoomState(zoomRef.current);
    };

    // `pending` holds the latest target until the shown zoom reaches it;
    // the frame loop keeps running on its own in between.
    // The settle's own scroll write reports back as a scroll event a frame
    // later; if a new gesture has begun by then it must not be cut short.
    let onNativeScroll = () => {
      let scroller = scrollerRef.current;
      let w = writtenScroll.current;
      if (
        scroller &&
        w &&
        scroller.scrollLeft === w.left &&
        scroller.scrollTop === w.top
      ) {
        writtenScroll.current = null;
        if (gesture.current)
          scroller.addEventListener("scroll", onNativeScroll, { once: true });
        return;
      }
      engine.settleNow();
    };

    let tick = (now: number, snap = false) => {
      raf.current = 0;
      let target = pending.current;
      let scroller = scrollerRef.current;
      let layer = layerRef.current;
      let spacer = spacerRef.current;
      if (!target || !scroller || !layer || !spacer) return;
      let g = gesture.current ?? beginGesture(scroller, spacer);
      let dt = lastFrame.current ? now - lastFrame.current : 0;
      lastFrame.current = now;
      let zoom =
        snap || target.immediate
          ? target.zoom
          : approachZoom(zoomRef.current, target.zoom, dt);
      if (zoom === target.zoom) pending.current = null;
      else raf.current = window.requestAnimationFrame(tick);
      zoomRef.current = zoom;
      setCanvasZoom(pageKey, zoom);
      let next = scrollForAnchor({ ...target, zoom });
      // Kept exact: each wheel event re-derives its anchor from this, and a
      // rounding error there is amplified by every later zoom-in step.
      g.virtual = { left: next.scrollLeft, top: next.scrollTop };
      // Chrome lands scroll offsets on whole CSS px, so the frame shows the
      // offset the settle will be able to write.
      let tx = g.scroll0.left - g.pad0.left - Math.round(g.virtual.left);
      let ty = g.scroll0.top - g.pad0.top - Math.round(g.virtual.top);
      layer.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(settle, IDLE_MS);
    };

    let engine: CanvasZoomEngine = {
      scrollerRef,
      layerRef,
      spacerRef,
      zoomRef,
      minRef,
      contentWidth,
      targetZoom: () => pending.current?.zoom ?? zoomRef.current,
      toViewport: (clientX, clientY) => {
        let rect = scrollerRef.current?.getBoundingClientRect();
        if (!rect) return { x: clientX, y: clientY };
        return {
          x: clientX - rect.left - (scrollerRef.current?.clientLeft || 0),
          y: clientY - rect.top - (scrollerRef.current?.clientTop || 0),
        };
      },
      canvasPointAt: (anchorViewport) => {
        let scroller = scrollerRef.current;
        let g = gesture.current;
        let scrollLeft = g
          ? g.virtual.left
          : (scroller?.scrollLeft || 0) - pads.current.left;
        let scrollTop = g
          ? g.virtual.top
          : (scroller?.scrollTop || 0) - pads.current.top;
        return anchorToCanvas({
          anchorViewport,
          scrollLeft,
          scrollTop,
          zoom: zoomRef.current,
        });
      },
      clamp: (z) => clampZoom(z, minRef.current, MAX_ZOOM),
      schedule: (target) => {
        pending.current = target;
        if (!raf.current) raf.current = window.requestAnimationFrame(tick);
      },
      settleNow: () => {
        if (raf.current) window.cancelAnimationFrame(raf.current);
        raf.current = 0;
        if (pending.current) tick(performance.now(), true);
        if (gesture.current) settle();
      },
    };
    return engine;
  }, [pageKey, scrollerRef, contentWidth]);

  // Runs before paint so a restored zoom never flashes. React attaches refs
  // bottom-up, so the scroller (an ancestor) has no ref yet in this layout
  // effect and is found from the spacer instead.
  //
  // On a fresh load nothing is written: the stylesheet already applied
  // fit-to-width, and rewriting it from JS (which only sees an integer
  // clientWidth) would move the scale by a fraction of a percent and make
  // Chrome re-raster the whole layer, which showed as the images blinking.
  // The engine instead adopts whatever scale is on screen.
  useIsomorphicLayoutEffect(() => {
    let layer = layerRef.current;
    let spacer = spacerRef.current;
    let scroller = scrollerRef.current ?? nearestScroller(spacer);
    if (!scroller || !layer || !spacer) return;
    fitScrollerToGutter(scroller, contentWidth);
    pads.current = { left: 0, top: 0 };
    spacer.style.padding = "";
    minRef.current = minZoom(scroller.clientWidth, contentWidth);
    setMin(minRef.current);
    let applied = appliedScale(layer);
    let z = hasCanvasZoom(pageKey)
      ? clampZoom(getCanvasZoom(pageKey), minRef.current, MAX_ZOOM)
      : applied;
    // Also skipped when a remount restores the value already on screen.
    if (Math.abs(z - applied) > 1e-6) {
      spacer.style.setProperty("--canvas-zoom", String(z));
      layer.style.setProperty("--canvas-zoom", String(z));
    }
    zoomRef.current = z;
    setCanvasZoom(pageKey, z);
    setZoomState(z);
    setReady(true);
  }, [pageKey, scrollerRef, contentWidth]);

  useEffect(() => {
    let scroller = scrollerRef.current;
    let layer = layerRef.current;
    let spacer = spacerRef.current;
    if (!scroller || !layer || !spacer) return;
    let scrollerObserver = new ResizeObserver(() => {
      fitScrollerToGutter(scroller, contentWidth);
      let m = minZoom(scroller.clientWidth, contentWidth);
      if (m === minRef.current) return;
      minRef.current = m;
      setMin(m);
    });
    scrollerObserver.observe(scroller);
    return () => {
      scrollerObserver.disconnect();
      if (raf.current) window.cancelAnimationFrame(raf.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      raf.current = 0;
      idleTimer.current = 0;
      pending.current = null;
      gesture.current = null;
    };
  }, [scrollerRef, contentWidth]);

  useCanvasZoomGestures(engine);

  let setZoom = useCallback(
    (z: number, anchor?: Point) => {
      let scroller = scrollerRef.current;
      let anchorViewport = anchor ?? {
        x: (scroller?.clientWidth || 0) / 2,
        y: (scroller?.clientHeight || 0) / 2,
      };
      engine.schedule({
        zoom: engine.clamp(z),
        anchorViewport,
        anchorCanvas: engine.canvasPointAt(anchorViewport),
      });
    },
    [engine, scrollerRef],
  );
  let zoomIn = useCallback(
    () => setZoom(nextStep(engine.targetZoom(), 1)),
    [engine, setZoom],
  );
  let zoomOut = useCallback(
    () => setZoom(nextStep(engine.targetZoom(), -1)),
    [engine, setZoom],
  );
  let reset = useCallback(() => setZoom(1), [setZoom]);

  let value = useMemo<CanvasZoomContextValue>(
    () => ({
      zoom,
      min,
      max: MAX_ZOOM,
      ready,
      zoomRef,
      zoomIn,
      zoomOut,
      reset,
      setZoom,
    }),
    [zoom, min, ready, zoomIn, zoomOut, reset, setZoom],
  );

  return (
    <CanvasZoomEngineContext.Provider value={engine}>
      <CanvasZoomContext.Provider value={value}>
        {props.children}
      </CanvasZoomContext.Provider>
    </CanvasZoomEngineContext.Provider>
  );
}

// The vertical scrollbar is carved out of the scroller's box, so a scroller
// exactly `contentWidth` wide has fewer client px than the content and
// scrolls sideways by the gutter. Idempotent: once the width includes the
// gutter, `offsetWidth - clientWidth` is unchanged and the same value is
// written again.
// A classic scrollbar would otherwise eat into the canvas width; overlay
// scrollbars leave the stylesheet width untouched.
function fitScrollerToGutter(scroller: HTMLElement, contentWidth: number) {
  let gutter = scroller.offsetWidth - scroller.clientWidth;
  let width = gutter > 0 ? `${contentWidth + gutter}px` : "";
  if (scroller.style.width !== width) scroller.style.width = width;
}

function appliedScale(layer: HTMLElement) {
  let transform = getComputedStyle(layer).transform;
  if (!transform || transform === "none") return 1;
  return new DOMMatrixReadOnly(transform).a;
}

function nearestScroller(el: HTMLElement | null) {
  for (let n = el?.parentElement; n; n = n.parentElement) {
    let overflowY = getComputedStyle(n).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return n;
  }
  return null;
}

export function useCanvasZoom() {
  let ctx = useContext(CanvasZoomContext);
  if (!ctx)
    throw new Error("useCanvasZoom must be used inside CanvasZoomProvider");
  return ctx;
}

// Animated uploads keep their file extension in storage; published blobs
// carry a mime type.
function isAnimatedImage(src: string | undefined, mimeType?: string) {
  if (mimeType === "image/gif" || mimeType === "image/apng") return true;
  return !!src && /\.(gif|apng|webp)(\?|$)/i.test(src);
}

/**
 * Attributes for an <img> that may sit inside the scaled canvas layer.
 * Every re-raster of that layer (settle, large scale changes) needs its
 * images decoded again at the new scale; with async decoding Chrome paints
 * the frame without them first, so they blink. And an animating image
 * invalidates the layer's tiles every frame, so when the settle re-raster
 * lands there is no valid old tile to keep showing and the whole layer goes
 * blank; giving it its own compositor layer keeps its frames out of the
 * canvas raster.
 */
export function useCanvasImage(
  src: string | undefined,
  mimeType?: string,
): { decoding: "sync" | "async"; className: string } {
  let inCanvas = !!useContext(CanvasZoomEngineContext);
  if (!inCanvas) return { decoding: "async", className: "" };
  return {
    decoding: "sync",
    className: isAnimatedImage(src, mimeType) ? "canvasAnimatedImage" : "",
  };
}

export function useCanvasZoomRef() {
  return useCanvasZoom().zoomRef;
}

/** Layer/spacer refs and content width, for CanvasZoomLayer. */
export function useCanvasZoomEngine() {
  let engine = useContext(CanvasZoomEngineContext);
  if (!engine)
    throw new Error("useCanvasZoomEngine must be used inside CanvasZoomProvider");
  return engine;
}
