// Live zoom per canvas page, kept for the life of the tab like the scroll
// positions in usePreserveScroll. Updated on every rendered frame of a gesture
// so non-React code (e.g. ProseMirror scroll handling) reads the same value
// the DOM currently shows.
const zoomByPage = new Map<string, number>();

let pinching = false;

export function getCanvasZoom(pageKey: string) {
  return zoomByPage.get(pageKey) ?? 1;
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
