"use client";
/**
 * Zoom engine for canvas pages. Native scroll stays on the existing scroller
 * (page snapping, scrollIntoView and momentum scrolling depend on it); the
 * content is scaled inside it and the scroll offset is rewritten so the
 * point under the cursor, pinch or viewport center stays put.
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
 * Layout. The layer (`.canvasZoomLayer`, permanently `will-change:
 * transform`) is scaled with a CSS transform inside a spacer sized content x
 * zoom, which gives the scroller its scrollable extent. Only the layer's
 * content is scaled: overlays that are siblings of the layer keep their
 * screen size. The stylesheet defaults `--canvas-zoom` to fit-to-width (or
 * to the canvas's anchored mobile area) so server-rendered HTML is already
 * at the right scale; on a fresh mount the engine adopts the scale on
 * screen rather than rewriting it, since a fractionally different value
 * makes Chrome re-raster the layer. The provider attaches its listeners to
 * `scrollerRef.current` in an effect, so the scroller must mount in the
 * same commit, and it widens the scroller by a classic scrollbar's gutter
 * so the gutter does not eat into the canvas width.
 *
 * Gestures. A frame of a running gesture writes only the layer's inline
 * transform: the scroll offset the anchor calls for is folded into a
 * translate on top of the scale, so the browser has no style, layout or
 * paint work per frame. Wheel, keyboard and button targets are eased toward
 * per frame (approachZoom); a pinch target is `immediate` and tracks the
 * fingers. Playing videos in the layer are paused for the gesture (WebKit
 * re-renders them on every ancestor transform change). The spacer resize,
 * the real scroll write and the React state update happen once at settle,
 * IDLE_MS after the last event, at touch end, or at once on a native scroll,
 * pixel-identical to the last frame.
 *
 * Empty space. The offset the anchor asks for can fall outside the content
 * (zooming out near a corner, or in around empty space). Rather than clamp
 * it, which would slide the content, the settle writes spacer padding equal
 * to the space left on each side, so the offset is always in range; that
 * padding is real scrollable space and is dropped again once a native
 * scroll has moved it fully off screen.
 *
 * Reading zoom:
 *   - `useCanvasZoom().zoom` is the settled value (React state).
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
  NO_PADS,
  type Pads,
  type Point,
  type Scroll,
  type Size,
  anchorToCanvas,
  approachZoom,
  centerOffset,
  centeredBox,
  clampZoom,
  contentBox,
  minZoom,
  nextStep,
  padsForScroll,
  scrollForAnchor,
  trimPads,
} from "./math";
import { getCanvasZoom, hasCanvasZoom, setCanvasZoom } from "./session";
import type { CanvasArea } from "./mobileView";
import { useCanvasZoomGestures } from "./useCanvasZoomGestures";
import { useCanvasDoubleTap } from "./useCanvasDoubleTap";

export { getCanvasZoom, isCanvasPinching } from "./session";

const IDLE_MS = 200;
// Debounce backing up `scrollend` for the padding trim (Safari lacks it).
const SCROLL_END_MS = 150;

export type ZoomTarget = {
  zoom: number;
  anchorViewport: Point;
  anchorCanvas: Point;
  /** Finger-driven (pinch): shown as is instead of eased toward. */
  immediate?: boolean;
};

// Geometry captured on a gesture's first frame. `scroll0` is what the
// scroller really sits on while the gesture runs and `pad0` the padding the
// content then sat behind; `virtual` is the offset the anchor asks for as if
// the content began at the scroller's origin, which the settle writes (with
// padding for any part outside the content).
type Gesture = {
  scroll0: Scroll;
  pad0: Scroll;
  virtual: Scroll;
  pausedMedia: HTMLMediaElement[];
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
  /** The content is centered in the viewport while it fits. */
  centered: boolean;
  /** Zoom the next rendered frame will show (pending target or live). */
  targetZoom: () => number;
  /** Viewport-relative point of the scroller's client box. */
  toViewport: (clientX: number, clientY: number) => Point;
  viewportCenter: () => Point;
  /** Canvas point currently under a viewport-relative point. */
  canvasPointAt: (anchorViewport: Point) => Point;
  clamp: (z: number) => number;
  schedule: (target: ZoomTarget) => void;
  /** Zooms (clamped) keeping the canvas point under a viewport point put. */
  zoomAt: (zoom: number, anchorViewport: Point, immediate?: boolean) => void;
  zoomAtClient: (
    zoom: number,
    clientX: number,
    clientY: number,
    immediate?: boolean,
  ) => void;
  /** Reconciles a running gesture now instead of after the idle delay. */
  settleNow: () => void;
  /** Drops settle padding a native scroll has moved off screen. */
  trimPads: () => void;
};

type CanvasZoomContextValue = {
  zoom: number;
  min: number;
  max: number;
  /** False until the client has read the on-screen zoom. */
  ready: boolean;
  /** Gestures and controls are off. */
  locked: boolean;
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
  /** Double tap zooms in (touch); off where a double tap means something else. */
  doubleTapZoom?: boolean;
  /** Viewers get no zoom gestures or controls; the initial framing stays. */
  lockViewerZoom?: boolean;
  scrollerRef: RefObject<HTMLElement | null>;
  contentWidth?: number;
  /**
   * Centers the content on each axis it fits in the viewport (the layer's
   * margins, see .canvasZoomCentered) and never leaves empty space beside
   * it on an axis it overflows. For fixed-size canvases.
   */
  centered?: boolean;
  /**
   * Area a fresh mount frames: the stylesheet already fits its width (via
   * `--canvas-mobile-area` on the layer's spacer), and the scroller is put
   * on its left edge here. A zoom kept from an earlier mount wins.
   */
  initialArea?: CanvasArea | null;
  children: ReactNode;
}) {
  let { pageKey, scrollerRef } = props;
  let initialArea = useRef(props.initialArea);
  initialArea.current = props.initialArea;
  let contentWidth = props.contentWidth ?? CONTENT_WIDTH;
  let centered = !!props.centered;
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
  // Offset the engine last wrote: its scroll event, reported a frame later,
  // must not pass for a native scroll.
  let writtenScroll = useRef<Scroll | null>(null);
  // Only the engine writes the spacer padding, so it is tracked here rather
  // than read back from style on hot paths.
  let pads = useRef<Pads>(NO_PADS);
  let lastFrame = useRef(0);
  let raf = useRef(0);
  let idleTimer = useRef(0);

  let engine = useMemo<CanvasZoomEngine>(() => {
    // Empty space around a centered canvas's content inside the spacer.
    let margin = (client: Size) =>
      centered ? centerOffset(client) : { left: 0, top: 0 };
    // The spacer's content box, which for a centered canvas includes the
    // margins.
    let spacerBox = (zoom: number, client: Size, contentHeight: number) =>
      centered
        ? centeredBox(zoom, { width: contentWidth, height: contentHeight }, client)
        : contentBox({
            zoom,
            contentWidth,
            contentHeight,
            clientWidth: client.width,
            clientHeight: client.height,
          });

    let writePads = (spacer: HTMLElement, next: Pads) => {
      pads.current = next;
      spacer.style.padding = `${next.top}px ${next.right}px ${next.bottom}px ${next.left}px`;
    };

    let writeScroll = (scroller: HTMLElement, scroll: Scroll) => {
      scroller.scrollLeft = scroll.left;
      scroller.scrollTop = scroll.top;
      writtenScroll.current = {
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
      };
    };

    let beginGesture = (
      scroller: HTMLElement,
      layer: HTMLElement,
      spacer: HTMLElement,
    ) => {
      let scroll0 = { left: scroller.scrollLeft, top: scroller.scrollTop };
      let client = {
        width: scroller.clientWidth,
        height: scroller.clientHeight,
      };
      let contentHeight = spacerContentHeight(spacer);
      let m = margin(client);
      let pad0 = {
        left: pads.current.left + m.left,
        top: pads.current.top + m.top,
      };
      let g: Gesture = {
        scroll0,
        pad0,
        virtual: { left: scroll0.left - pad0.left, top: scroll0.top - pad0.top },
        pausedMedia: [],
        clientWidth: client.width,
        clientHeight: client.height,
        contentHeight,
      };
      for (let media of layer.querySelectorAll("video")) {
        if (media.paused || media.ended) continue;
        media.pause();
        g.pausedMedia.push(media);
      }
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
        let scroll = {
          left: Math.round(g.virtual.left) + scroller.scrollLeft - g.scroll0.left,
          top: Math.round(g.virtual.top) + scroller.scrollTop - g.scroll0.top,
        };
        let z = zoomRef.current;
        let client = { width: g.clientWidth, height: g.clientHeight };
        let box = spacerBox(z, client, g.contentHeight);
        let m = margin(client);
        scroll = {
          left: Math.round(scroll.left + m.left),
          top: Math.round(scroll.top + m.top),
        };
        let pad = padsForScroll(scroll, client, box);
        writePads(spacer, pad);
        spacer.style.setProperty("--canvas-zoom", String(z));
        layer.style.setProperty("--canvas-zoom", String(z));
        layer.style.transform = "";
        writeScroll(scroller, {
          left: scroll.left + pad.left,
          top: scroll.top + pad.top,
        });
        // Resumed a frame later so the restart does not share the settle's
        // layout frame.
        let paused = g.pausedMedia;
        if (paused.length)
          window.requestAnimationFrame(() => {
            for (let media of paused) media.play().catch(() => {});
          });
      }
      setZoomState(zoomRef.current);
    };

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

    // `pending` holds the latest target until the shown zoom reaches it; the
    // frame loop keeps running on its own in between.
    let tick = (now: number, snap = false) => {
      raf.current = 0;
      let target = pending.current;
      let scroller = scrollerRef.current;
      let layer = layerRef.current;
      let spacer = spacerRef.current;
      if (!target || !scroller || !layer || !spacer) return;
      let g = gesture.current ?? beginGesture(scroller, layer, spacer);
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
      centered,
      targetZoom: () => pending.current?.zoom ?? zoomRef.current,
      toViewport: (clientX, clientY) => {
        let scroller = scrollerRef.current;
        let rect = scroller?.getBoundingClientRect();
        if (!scroller || !rect) return { x: clientX, y: clientY };
        return {
          x: clientX - rect.left - scroller.clientLeft,
          y: clientY - rect.top - scroller.clientTop,
        };
      },
      viewportCenter: () => {
        let scroller = scrollerRef.current;
        return {
          x: (scroller?.clientWidth || 0) / 2,
          y: (scroller?.clientHeight || 0) / 2,
        };
      },
      canvasPointAt: (anchorViewport) => {
        let scroller = scrollerRef.current;
        let g = gesture.current;
        let m = scroller
          ? margin({
              width: scroller.clientWidth,
              height: scroller.clientHeight,
            })
          : { left: 0, top: 0 };
        return anchorToCanvas({
          anchorViewport,
          scrollLeft: g
            ? g.virtual.left
            : (scroller?.scrollLeft || 0) - pads.current.left - m.left,
          scrollTop: g
            ? g.virtual.top
            : (scroller?.scrollTop || 0) - pads.current.top - m.top,
          zoom: zoomRef.current,
        });
      },
      clamp: (z) => clampZoom(z, minRef.current, MAX_ZOOM),
      schedule: (target) => {
        pending.current = target;
        if (!raf.current) raf.current = window.requestAnimationFrame(tick);
      },
      zoomAt: (zoom, anchorViewport, immediate) =>
        engine.schedule({
          zoom: engine.clamp(zoom),
          anchorViewport,
          anchorCanvas: engine.canvasPointAt(anchorViewport),
          immediate,
        }),
      zoomAtClient: (zoom, clientX, clientY, immediate) =>
        engine.zoomAt(zoom, engine.toViewport(clientX, clientY), immediate),
      settleNow: () => {
        if (raf.current) window.cancelAnimationFrame(raf.current);
        raf.current = 0;
        if (pending.current) tick(performance.now(), true);
        if (gesture.current) settle();
      },
      trimPads: () => {
        let scroller = scrollerRef.current;
        let spacer = spacerRef.current;
        if (gesture.current || !scroller || !spacer) return;
        let scroll = { left: scroller.scrollLeft, top: scroller.scrollTop };
        let client = {
          width: scroller.clientWidth,
          height: scroller.clientHeight,
        };
        let box = spacerBox(
          zoomRef.current,
          client,
          spacerContentHeight(spacer),
        );
        let trimmed = trimPads(pads.current, scroll, client, box);
        if (!trimmed) return;
        writePads(spacer, trimmed.pads);
        writeScroll(scroller, {
          left: scroll.left - trimmed.shift.left,
          top: scroll.top - trimmed.shift.top,
        });
      },
    };
    return engine;
  }, [pageKey, scrollerRef, contentWidth, centered]);

  // Runs before paint so a restored zoom never flashes. React attaches refs
  // bottom-up, so the scroller (an ancestor) has no ref yet in this layout
  // effect and is found from the spacer instead.
  useIsomorphicLayoutEffect(() => {
    let layer = layerRef.current;
    let spacer = spacerRef.current;
    let scroller = scrollerRef.current ?? nearestScroller(spacer);
    if (!scroller || !layer || !spacer) return;
    fitScrollerToGutter(scroller, contentWidth);
    pads.current = NO_PADS;
    spacer.style.padding = "";
    minRef.current = minZoom(scroller.clientWidth, contentWidth);
    setMin(minRef.current);
    let applied = appliedScale(layer);
    let restored = hasCanvasZoom(pageKey);
    let z = restored
      ? clampZoom(getCanvasZoom(pageKey), minRef.current, MAX_ZOOM)
      : applied;
    // Nothing is written when the value already on screen is kept: the
    // stylesheet's fit-to-width differs from what JS computes from the
    // integer clientWidth by a fraction of a percent, and a rewrite makes
    // Chrome re-raster the whole layer (images blink).
    if (Math.abs(z - applied) > 1e-6) {
      spacer.style.setProperty("--canvas-zoom", String(z));
      layer.style.setProperty("--canvas-zoom", String(z));
    }
    let area = initialArea.current;
    if (!restored && area && area.left > 0) scroller.scrollLeft = area.left * z;
    // Opens with the content centered in its margins.
    if (centered) {
      scroller.scrollLeft = (contentWidth * z) / 2;
      scroller.scrollTop = (spacerContentHeight(spacer) * z) / 2;
    }
    zoomRef.current = z;
    setCanvasZoom(pageKey, z);
    setZoomState(z);
    setReady(true);
  }, [pageKey, scrollerRef, contentWidth, centered]);

  // The stylesheet's default zoom follows the mobile area, but a mounted canvas
  // keeps the zoom the engine already holds; the area only frames fresh loads.
  let areaWidth = props.initialArea?.width ?? null;
  let mountedArea = useRef(areaWidth);
  useIsomorphicLayoutEffect(() => {
    if (mountedArea.current === areaWidth) return;
    mountedArea.current = areaWidth;
    let z = String(zoomRef.current);
    spacerRef.current?.style.setProperty("--canvas-zoom", z);
    layerRef.current?.style.setProperty("--canvas-zoom", z);
  }, [areaWidth]);

  useEffect(() => {
    let scroller = scrollerRef.current;
    if (!scroller || !layerRef.current || !spacerRef.current) return;
    let abort = new AbortController();
    let signal = abort.signal;

    let scrollerObserver = new ResizeObserver(() => {
      fitScrollerToGutter(scroller, contentWidth);
      let m = minZoom(scroller.clientWidth, contentWidth);
      if (m === minRef.current) return;
      minRef.current = m;
      setMin(m);
    });
    scrollerObserver.observe(scroller);

    // Trimming mid-momentum would stutter, so it waits for the scroll to end.
    let trimTimer = 0;
    let trimNow = () => {
      if (trimTimer) window.clearTimeout(trimTimer);
      trimTimer = 0;
      engine.trimPads();
    };
    let trimSoon = () => {
      if (gesture.current) return;
      if (trimTimer) window.clearTimeout(trimTimer);
      trimTimer = window.setTimeout(trimNow, SCROLL_END_MS);
    };
    scroller.addEventListener("scroll", trimSoon, { passive: true, signal });
    scroller.addEventListener("scrollend", trimNow, { signal });
    scroller.addEventListener("pointerup", trimSoon, { signal });
    scroller.addEventListener("touchend", trimSoon, { passive: true, signal });

    return () => {
      abort.abort();
      scrollerObserver.disconnect();
      if (trimTimer) window.clearTimeout(trimTimer);
      if (raf.current) window.cancelAnimationFrame(raf.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      raf.current = 0;
      idleTimer.current = 0;
      pending.current = null;
      gesture.current = null;
    };
  }, [engine, scrollerRef, contentWidth]);

  let locked = !!props.lockViewerZoom;
  useCanvasZoomGestures(engine, !locked);
  useCanvasDoubleTap(engine, (props.doubleTapZoom ?? true) && !locked);

  let setZoom = useCallback(
    (z: number, anchor?: Point) =>
      engine.zoomAt(z, anchor ?? engine.viewportCenter()),
    [engine],
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
      locked,
      zoomRef,
      zoomIn,
      zoomOut,
      reset,
      setZoom,
    }),
    [zoom, min, ready, locked, zoomIn, zoomOut, reset, setZoom],
  );

  return (
    <CanvasZoomEngineContext.Provider value={engine}>
      <CanvasZoomContext.Provider value={value}>
        {props.children}
      </CanvasZoomContext.Provider>
    </CanvasZoomEngineContext.Provider>
  );
}

// Canvas px; CanvasZoomLayer sets it inline from the laid-out content.
function spacerContentHeight(spacer: HTMLElement) {
  return Number(spacer.style.getPropertyValue("--canvas-content-height")) || 0;
}

// A classic (non-overlay) vertical scrollbar is carved out of the scroller's
// box, so a scroller exactly `contentWidth` wide has fewer client px than
// the content and scrolls sideways by the gutter. Idempotent: once the width
// includes the gutter, `offsetWidth - clientWidth` is unchanged.
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
 * A re-raster of that layer needs its images decoded again at the new
 * scale; with async decoding Chrome paints the frame without them first, so
 * they blink. An animating image invalidates the layer's tiles every frame,
 * so giving it its own compositor layer keeps its frames out of the canvas
 * raster.
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
