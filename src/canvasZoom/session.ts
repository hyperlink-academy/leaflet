// Live zoom per canvas page for the tab's life, updated on every gesture frame
// so non-React readers see the value the DOM currently shows.
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
