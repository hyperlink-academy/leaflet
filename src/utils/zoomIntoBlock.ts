import { flushSync } from "react-dom";
import { useUIState } from "src/useUIState";
import { elementId } from "src/utils/elementId";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";

// Zooming removes everything above the root, so the scroll offset that had it
// on screen may leave it above the viewport once the filtered list commits.
export function zoomIntoBlock(page: string, blockEntity: string) {
  flushSync(() => {
    useUIState.getState().zoomIntoBlock(page, blockEntity);
  });
  scrollIntoViewIfNeeded(
    document.getElementById(elementId.block(blockEntity).container),
    false,
  );
}
