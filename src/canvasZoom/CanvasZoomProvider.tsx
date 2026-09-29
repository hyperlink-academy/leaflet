"use client";
// Zoom engine for canvas pages. Native scroll stays on the scrollers (page
// snapping, scrollIntoView and momentum depend on it); the content is scaled
// inside and the offset rewritten so the anchor point stays put. Listeners
// attach in an effect, so the box must mount in the same commit.
import {
  createContext,
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
  MAX_ZOOM,
  NO_PADS,
  type Pads,
  type Point,
  type Scroll,
  type ScrollRange,
  anchorToCanvas,
  approachZoom,
  clampZoom,
  fitZoom,
  minZoom,
  nextStep,
  padsForScroll,
  scrollForAnchor,
  trimPads,
} from "./math";
import { getCanvasZoom, hasCanvasZoom, setCanvasZoom } from "./session";
import type { CanvasArea } from "./mobileView";
import { useCanvasZoomGestures } from "./useCanvasZoomGestures";

export { getCanvasZoom, isCanvasPinching } from "./session";

const IDLE_MS = 200;
// Debounce backing up `scrollend` for the padding trim (Safari lacks it).
const SCROLL_END_MS = 150;

type ZoomTarget = {
  zoom: number;
  anchorViewport: Point;
  anchorCanvas: Point;
  /** Finger-driven (pinch): shown as is instead of eased toward. */
  immediate?: boolean;
};

// Captured on a gesture's first frame. `scroll0` is where the scrollers sit
// throughout, `origin0` where the content began (`base0` without padding);
// `virtual` is the offset the anchor asks for relative to the content.
type Gesture = {
  scroll0: Scroll;
  origin0: Scroll;
  base0: Scroll;
  virtual: Scroll;
  pausedMedia: HTMLMediaElement[];
};

type Scrollers = { x: HTMLElement; y: HTMLElement };

// How far the stylesheet's fit to the box's width may be from the script's,
// which divides the box's whole px. Past it the engine has the stylesheet's
// math wrong, and the fit is written by script: at mount, and when the box
// resizes for as long as the stylesheet's would have applied.
const FIT_TOLERANCE = 0.02;

type Rect = { left: number; top: number; width: number; height: number };

export type CanvasZoomEngine = {
  /** The canvas box: gestures land on it and the canvas fits its width. */
  boxRef: RefObject<HTMLElement | null>;
  layerRef: RefObject<HTMLDivElement | null>;
  spacerRef: RefObject<HTMLDivElement | null>;
  minRef: RefObject<number>;
  contentWidth: number;
  centered: boolean;
  pageScroll: boolean;
  /** Framed by the stylesheet: no zoom and no sideways scroll. */
  locked: boolean;
  /** Zoom the next rendered frame will show (pending target or live). */
  targetZoom: () => number;
  viewportRect: () => Rect;
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
  locked: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

const CanvasZoomContext = createContext<CanvasZoomContextValue | null>(null);
// Stable for the provider's life, so subscribers (every image block, the
// layer) are not re-rendered by each settle.
const CanvasZoomEngineContext = createContext<CanvasZoomEngine | null>(null);

export function CanvasZoomProvider(props: {
  pageKey: string;
  /** Double tap zooms in (touch); off where a double tap means something else. */
  doubleTapZoom?: boolean;
  /** Viewers get no zoom and no sideways scroll; the initial framing stays. */
  lockViewerZoom?: boolean;
  /** The page around the box scrolls vertically; the box only sideways. */
  pageScroll?: boolean;
  contentWidth: number;
  /** Half a viewport of margin on every side, opening centered (drawings). */
  centered?: boolean;
  /**
   * Area a fresh mount frames: the stylesheet fits its width, the box is
   * scrolled to its left edge here. A zoom kept from an earlier mount wins.
   */
  initialArea?: CanvasArea | null;
  children: ReactNode;
}) {
  let { pageKey, contentWidth } = props;
  let pageScroll = !!props.pageScroll;
  let initialArea = useRef(props.initialArea);
  initialArea.current = props.initialArea;
  let centered = !!props.centered;
  let locked = !!props.lockViewerZoom;
  let boxRef = useRef<HTMLElement>(null);
  let scrollerRef = useRef<HTMLElement>(null);
  let layerRef = useRef<HTMLDivElement>(null);
  let spacerRef = useRef<HTMLDivElement>(null);
  let minRef = useRef(0.25);
  let [zoom, setZoomState] = useState(getCanvasZoom(pageKey));
  let [min, setMin] = useState(minRef.current);
  let [ready, setReady] = useState(false);

  let pending = useRef<ZoomTarget | null>(null);
  let gesture = useRef<Gesture | null>(null);
  // Offset the engine last wrote: its scroll event, reported a frame later,
  // must not pass for a native scroll.
  let writtenScroll = useRef<Scroll | null>(null);
  // Engine-written only, so not read back from style on hot paths.
  let pads = useRef<Pads>(NO_PADS);
  let stylesheetMisfits = useRef(false);
  let fitByScript = useRef(false);
  let lastFrame = useRef(0);
  let raf = useRef(0);
  let idleTimer = useRef(0);

  let engine = useMemo<CanvasZoomEngine>(() => {
    let scrollers = (): Scrollers | null => {
      let x = boxRef.current;
      let y = scrollerRef.current;
      return x && y ? { x, y } : null;
    };
    let readScroll = (s: Scrollers): Scroll => ({
      left: s.x.scrollLeft,
      top: s.y.scrollTop,
    });
    let range = (s: Scrollers): ScrollRange => ({
      width: s.x.clientWidth,
      height: s.y.clientHeight,
      scrollWidth: s.x.scrollWidth,
      scrollHeight: s.y.scrollHeight,
    });
    // Where an element's box starts in the scrollers' extent. The layer's
    // scale has a 0 0 origin, so its top-left is unscaled.
    let originOf = (s: Scrollers, el: HTMLElement): Scroll => {
      let r = el.getBoundingClientRect();
      let xr = s.x.getBoundingClientRect();
      let yr = s.y.getBoundingClientRect();
      return {
        left: r.left - xr.left - s.x.clientLeft + s.x.scrollLeft,
        top: r.top - yr.top - s.y.clientTop + s.y.scrollTop,
      };
    };

    let writePads = (spacer: HTMLElement, next: Pads) => {
      pads.current = next;
      spacer.style.padding = `${next.top}px ${next.right}px ${next.bottom}px ${next.left}px`;
    };

    let writeScroll = (s: Scrollers, scroll: Scroll) => {
      s.x.scrollLeft = scroll.left;
      s.y.scrollTop = scroll.top;
      writtenScroll.current = readScroll(s);
    };

    let each = (s: Scrollers) => (s.x === s.y ? [s.x] : [s.x, s.y]);
    let watchNativeScroll = (s: Scrollers) => {
      for (let el of each(s)) {
        el.removeEventListener("scroll", onNativeScroll);
        el.addEventListener("scroll", onNativeScroll, { once: true });
      }
    };
    let unwatchNativeScroll = (s: Scrollers) => {
      for (let el of each(s)) el.removeEventListener("scroll", onNativeScroll);
    };

    let beginGesture = (s: Scrollers, layer: HTMLElement) => {
      let scroll0 = readScroll(s);
      let origin0 = originOf(s, layer);
      let g: Gesture = {
        scroll0,
        origin0,
        base0: {
          left: origin0.left - pads.current.left,
          top: origin0.top - pads.current.top,
        },
        virtual: {
          left: scroll0.left - origin0.left,
          top: scroll0.top - origin0.top,
        },
        pausedMedia: [],
      };
      // WebKit re-renders playing video on every ancestor transform change.
      for (let media of layer.querySelectorAll("video")) {
        if (media.paused || media.ended) continue;
        media.pause();
        g.pausedMedia.push(media);
      }
      gesture.current = g;
      watchNativeScroll(s);
      return g;
    };

    let settle = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = 0;
      lastFrame.current = 0;
      let g = gesture.current;
      gesture.current = null;
      let s = scrollers();
      let layer = layerRef.current;
      let spacer = spacerRef.current;
      if (g && s && layer && spacer) {
        fitByScript.current = false;
        unwatchNativeScroll(s);
        // Read before the spacer resizes, which can clamp or anchor the
        // offset; the difference is a native scroll made mid-gesture.
        let now = readScroll(s);
        let scroll = {
          left: Math.round(
            Math.round(g.virtual.left) +
              now.left -
              g.scroll0.left +
              g.base0.left,
          ),
          top: Math.round(
            Math.round(g.virtual.top) + now.top - g.scroll0.top + g.base0.top,
          ),
        };
        let z = getCanvasZoom(pageKey);
        // Out-of-range offsets are padded for, not clamped (which would slide
        // the content). The spacer is sized unpadded first, to see how far
        // the scrollers reach around it.
        spacer.style.padding = "";
        spacer.style.setProperty("--canvas-zoom", String(z));
        layer.style.setProperty("--canvas-zoom", String(z));
        let pad = padsForScroll(scroll, range(s));
        writePads(spacer, pad);
        layer.style.transform = "";
        writeScroll(s, {
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
      setZoomState(getCanvasZoom(pageKey));
    };

    // The offset the engine wrote is kept until a scroll moves off it (two
    // scrollers can report a write as two events).
    let onNativeScroll = () => {
      let s = scrollers();
      let w = writtenScroll.current;
      if (s && w) {
        let now = readScroll(s);
        if (now.left === w.left && now.top === w.top) {
          if (gesture.current) watchNativeScroll(s);
          return;
        }
        writtenScroll.current = null;
      }
      engine.settleNow();
    };

    // A frame writes only the layer transform, the anchor's scroll folded
    // into a translate; spacer size, scroll and React state wait for settle.
    let tick = (now: number, snap = false) => {
      raf.current = 0;
      let target = pending.current;
      let s = scrollers();
      let layer = layerRef.current;
      if (!target || !s || !layer) return;
      let g = gesture.current ?? beginGesture(s, layer);
      let dt = lastFrame.current ? now - lastFrame.current : 0;
      lastFrame.current = now;
      let zoom =
        snap || target.immediate
          ? target.zoom
          : approachZoom(getCanvasZoom(pageKey), target.zoom, dt);
      if (zoom === target.zoom) pending.current = null;
      else raf.current = window.requestAnimationFrame(tick);
      setCanvasZoom(pageKey, zoom);
      let next = scrollForAnchor({ ...target, zoom });
      // Kept exact: each wheel event re-derives its anchor from this, and a
      // rounding error there is amplified by every later zoom-in step.
      g.virtual = { left: next.scrollLeft, top: next.scrollTop };
      // Chrome lands scroll offsets on whole CSS px, so the frame shows the
      // offset the settle will be able to write.
      let tx = g.scroll0.left - g.origin0.left - Math.round(g.virtual.left);
      let ty = g.scroll0.top - g.origin0.top - Math.round(g.virtual.top);
      layer.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(settle, IDLE_MS);
    };

    let engine: CanvasZoomEngine = {
      boxRef,
      layerRef,
      spacerRef,
      minRef,
      contentWidth,
      centered,
      pageScroll,
      locked,
      targetZoom: () => pending.current?.zoom ?? getCanvasZoom(pageKey),
      viewportRect: () => {
        let s = scrollers();
        if (!s) return { left: 0, top: 0, width: 0, height: 0 };
        return {
          left: s.x.getBoundingClientRect().left + s.x.clientLeft,
          top: s.y.getBoundingClientRect().top + s.y.clientTop,
          width: s.x.clientWidth,
          height: s.y.clientHeight,
        };
      },
      toViewport: (clientX, clientY) => {
        let rect = engine.viewportRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
      },
      viewportCenter: () => {
        let rect = engine.viewportRect();
        return { x: rect.width / 2, y: rect.height / 2 };
      },
      canvasPointAt: (anchorViewport) => {
        let g = gesture.current;
        let s = scrollers();
        let layer = layerRef.current;
        let scroll = s ? readScroll(s) : { left: 0, top: 0 };
        let origin = s && layer ? originOf(s, layer) : pads.current;
        return anchorToCanvas({
          anchorViewport,
          scrollLeft: g ? g.virtual.left : scroll.left - origin.left,
          scrollTop: g ? g.virtual.top : scroll.top - origin.top,
          zoom: getCanvasZoom(pageKey),
        });
      },
      clamp: (z) => clampZoom(z, minRef.current),
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
        let s = scrollers();
        let spacer = spacerRef.current;
        if (gesture.current || !s || !spacer) return;
        let scroll = readScroll(s);
        let trimmed = trimPads(
          pads.current,
          scroll,
          originOf(s, spacer),
          range(s),
        );
        if (!trimmed) return;
        writePads(spacer, trimmed.pads);
        writeScroll(s, {
          left: scroll.left - trimmed.shift.left,
          top: scroll.top - trimmed.shift.top,
        });
      },
    };
    return engine;
  }, [pageKey, contentWidth, centered, pageScroll, locked]);

  let areaWidth = props.initialArea?.width ?? null;
  // Runs before paint so a restored zoom never flashes. A mounted canvas
  // keeps its zoom when the mobile area (the stylesheet's default) changes.
  useLayoutEffect(() => {
    let layer = layerRef.current;
    let spacer = spacerRef.current;
    // An ancestor's ref isn't attached yet here, so the box is found this way.
    let box = spacer?.parentElement ?? null;
    let scroller = pageScroll ? nearestScroller(box) : box;
    boxRef.current = box;
    scrollerRef.current = scroller;
    if (!box || !scroller || !layer || !spacer) return;
    pads.current = NO_PADS;
    spacer.style.padding = "";
    minRef.current = minZoom(box.clientWidth, contentWidth);
    setMin(minRef.current);
    let applied = appliedScale(layer);
    let restored = !locked && hasCanvasZoom(pageKey);
    let area = initialArea.current;
    let fit = fitZoom(box.clientWidth, area?.width ?? contentWidth);
    // With nothing written inline, the applied scale is the stylesheet's.
    if (box.clientWidth && !layer.style.getPropertyValue("--canvas-zoom"))
      stylesheetMisfits.current =
        Math.abs(applied - fit) > FIT_TOLERANCE * fit;
    let z = restored
      ? clampZoom(getCanvasZoom(pageKey), minRef.current)
      : stylesheetMisfits.current
        ? fit
        : applied;
    fitByScript.current =
      stylesheetMisfits.current && Math.abs(z - fit) < 1e-6;
    // A fresh load adopts the stylesheet's scale unwritten: JS's value from
    // the integer clientWidth differs slightly, and a rewrite makes Chrome
    // re-raster the whole layer (images blink).
    if (Math.abs(z - applied) > 1e-6) {
      spacer.style.setProperty("--canvas-zoom", String(z));
      layer.style.setProperty("--canvas-zoom", String(z));
    }
    if (!locked && !restored && area && area.left > 0)
      box.scrollLeft = area.left * z;
    if (centered) {
      let contentHeight =
        Number(spacer.style.getPropertyValue("--canvas-content-height")) || 0;
      box.scrollLeft = (contentWidth * z) / 2;
      scroller.scrollTop = (contentHeight * z) / 2;
    }
    setCanvasZoom(pageKey, z);
    setZoomState(z);
    setReady(true);
  }, [pageKey, contentWidth, centered, pageScroll, locked, areaWidth]);

  useEffect(() => {
    let box = boxRef.current;
    let scroller = scrollerRef.current;
    if (!box || !scroller || !layerRef.current || !spacerRef.current) return;
    let abort = new AbortController();
    let signal = abort.signal;

    let boxObserver = new ResizeObserver(() => {
      if (fitByScript.current && !gesture.current) {
        let z = fitZoom(
          box.clientWidth,
          initialArea.current?.width ?? contentWidth,
        );
        spacerRef.current?.style.setProperty("--canvas-zoom", String(z));
        layerRef.current?.style.setProperty("--canvas-zoom", String(z));
        setCanvasZoom(pageKey, z);
        setZoomState(z);
      }
      let m = minZoom(box.clientWidth, contentWidth);
      if (m === minRef.current) return;
      minRef.current = m;
      setMin(m);
    });
    boxObserver.observe(box);

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
    for (let el of new Set([box, scroller])) {
      el.addEventListener("scroll", trimSoon, { passive: true, signal });
      el.addEventListener("scrollend", trimNow, { signal });
    }
    box.addEventListener("pointerup", trimSoon, { signal });
    box.addEventListener("touchend", trimSoon, { passive: true, signal });

    return () => {
      abort.abort();
      boxObserver.disconnect();
      if (trimTimer) window.clearTimeout(trimTimer);
      if (raf.current) window.cancelAnimationFrame(raf.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      raf.current = 0;
      idleTimer.current = 0;
      pending.current = null;
      gesture.current = null;
    };
  }, [engine, contentWidth, pageKey]);

  useCanvasZoomGestures(engine, !locked, props.doubleTapZoom ?? true);

  let value = useMemo<CanvasZoomContextValue>(() => {
    let setZoom = (z: number) => engine.zoomAt(z, engine.viewportCenter());
    return {
      zoom,
      min,
      max: MAX_ZOOM,
      ready,
      locked,
      zoomIn: () => setZoom(nextStep(engine.targetZoom(), 1)),
      zoomOut: () => setZoom(nextStep(engine.targetZoom(), -1)),
      reset: () => setZoom(1),
    };
  }, [engine, zoom, min, ready, locked]);

  return (
    <CanvasZoomEngineContext.Provider value={engine}>
      <CanvasZoomContext.Provider value={value}>
        {props.children}
      </CanvasZoomContext.Provider>
    </CanvasZoomEngineContext.Provider>
  );
}

function appliedScale(layer: HTMLElement) {
  let transform = getComputedStyle(layer).transform;
  if (!transform || transform === "none") return 1;
  return new DOMMatrixReadOnly(transform).a;
}

export function nearestScroller(el: HTMLElement | null) {
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

// Sync decode so a layer re-raster doesn't blink images; animated images get
// their own compositor layer so their frames stay out of the canvas raster.
export function useCanvasImage(
  src: string | undefined,
  mimeType?: string,
): { decoding: "sync" | "async"; className: string } {
  if (!useContext(CanvasZoomEngineContext))
    return { decoding: "async", className: "" };
  // Uploads keep their file extension; published blobs carry a mime type.
  let animated =
    mimeType === "image/gif" ||
    mimeType === "image/apng" ||
    (!!src && /\.(gif|apng|webp)(\?|$)/i.test(src));
  return { decoding: "sync", className: animated ? "canvasAnimatedImage" : "" };
}

// The zoom a canvas has settled at, and 1 outside of one. A render can't read
// the live zoom from the session instead: React Compiler caches that call.
export function useCanvasZoomLevel() {
  return useContext(CanvasZoomContext)?.zoom ?? 1;
}
export function useCanvasZoomEngine() {
  let engine = useContext(CanvasZoomEngineContext);
  if (!engine)
    throw new Error(
      "useCanvasZoomEngine must be used inside CanvasZoomProvider",
    );
  return engine;
}
