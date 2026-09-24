import { useEntity } from "src/replicache";
import type { CanvasSize } from "src/utils/embeddedCanvasSize";

// A drawing's canvas is bounded; any other canvas returns null.
export function useCanvasFixedSize(pageID: string | null): CanvasSize | null {
  let width = useEntity(pageID, "canvas/fixed-width")?.data.value;
  let height = useEntity(pageID, "canvas/fixed-height")?.data.value;
  if (!width || !height) return null;
  return { width, height };
}
