import { CONTENT_WIDTH } from "./math";

export type CanvasMobileView = "unconstrained" | "left" | "center";

// Width of the phone-sized area an anchored mobile view frames, in canvas px:
// a common phone width, so a phone shows that area at 1:1.
export const MOBILE_VIEW_WIDTH = 390;

export type CanvasArea = { left: number; width: number };

/** The canvas area a narrow viewport should frame, or null for fit-to-width. */
export function mobileViewArea(view?: string | null): CanvasArea | null {
  if (view === "left") return { left: 0, width: MOBILE_VIEW_WIDTH };
  if (view === "center")
    return {
      left: Math.round((CONTENT_WIDTH - MOBILE_VIEW_WIDTH) / 2),
      width: MOBILE_VIEW_WIDTH,
    };
  return null;
}
