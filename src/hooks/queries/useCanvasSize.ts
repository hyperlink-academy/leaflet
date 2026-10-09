import { useMemo } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { canvasContentHeight } from "src/utils/canvasBlockOrder";
import { CONTENT_WIDTH } from "src/canvasZoom/math";
import type { CanvasBounds } from "src/utils/embeddedCanvasSize";
import { publicationCanvasWidth } from "src/utils/publicationCanvasWidth";
import { useLeafletPublicationPage } from "components/PageSWRDataProvider";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

// A drawing's canvas is its set size.
export function useCanvasSize(pageID: string | null): CanvasBounds {
  let blocks = useEntity(pageID, "canvas/block");
  let fixedWidth = useEntity(pageID, "canvas/fixed-width")?.data.value;
  let fixedHeight = useEntity(pageID, "canvas/fixed-height")?.data.value;
  let fixed = !!fixedWidth && !!fixedHeight;

  let { rootEntity } = useReplicache();
  let publicationRoot = useLeafletPublicationPage() ? rootEntity : null;
  let isPublicationPage = useEntity(publicationRoot, "root/page").some(
    (page) => page.data.value === pageID,
  );
  let pageWidth = useEntity(publicationRoot, "theme/page-width")?.data.value;
  let showPageBackground = !useCardBorderHidden();

  let width =
    (fixed && fixedWidth) ||
    (isPublicationPage
      ? publicationCanvasWidth(pageWidth, showPageBackground)
      : CONTENT_WIDTH);
  let height =
    (fixed && fixedHeight) ||
    canvasContentHeight(blocks.map((b) => b.data.position));
  return useMemo(() => ({ width, height, fixed }), [width, height, fixed]);
}
