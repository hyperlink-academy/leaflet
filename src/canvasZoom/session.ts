// Live zoom per canvas page for the tab's life, updated on every gesture frame
// so non-React readers see the value the DOM currently shows.
const zoomByPage = new Map<string, number>();

let pinching = false;

export function getCanvasZoom(pageKey: string) {
  return zoomByPage.get(pageKey) ?? 1;
}

type ClientPoint = { clientX: number; clientY: number };

// `el` is the canvas content element, which the live zoom scales.
export function clientToCanvas(el: Element, pageKey: string, p: ClientPoint) {
  let rect = el.getBoundingClientRect();
  let zoom = getCanvasZoom(pageKey);
  return {
    x: (p.clientX - rect.left) / zoom,
    y: (p.clientY - rect.top) / zoom,
  };
}

export function hasCanvasZoom(pageKey: string) {
  return zoomByPage.has(pageKey);
}

export function setCanvasZoom(pageKey: string, zoom: number) {
  zoomByPage.set(pageKey, zoom);
}

export function isCanvasPinching() {
  return pinching;
}

export function setCanvasPinching(value: boolean) {
  pinching = value;
}
