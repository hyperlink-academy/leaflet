import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import { getBlockStructureMirror } from "src/replicache/blockMirror";
import { getPageReadingOrder } from "src/replicache/getBlocks";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";
import { elementId } from "src/utils/elementId";
import { focusBlock } from "src/utils/focusBlock";

export async function focusPage(
  pageID: string,
  rep: Replicache<ReplicacheMutators>,
  focusFirstBlock?: "focusFirstBlock",
) {
  // if this page is already focused,
  let focusedBlock = useUIState.getState().focusedEntity;
  // else set this page as focused
  useUIState.setState(() => ({
    focusedEntity: {
      entityType: "page",
      entityID: pageID,
    },
  }));

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollIntoViewIfNeeded(
        document.getElementById(elementId.page(pageID).container),
        false,
        "smooth",
        0.8,
      );
    });
  });

  if (focusFirstBlock === "focusFirstBlock") {
    setTimeout(() => {
      let firstBlock = getPageReadingOrder(
        getBlockStructureMirror(rep),
        pageID,
      )[0];
      if (firstBlock) {
        setTimeout(() => {
          focusBlock(firstBlock, { type: "start" });
        }, 500);
      }
    }, 50);
  }
}
