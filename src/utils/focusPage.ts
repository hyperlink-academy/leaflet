import { Replicache } from "replicache";
import { Fact, ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import { scanIndex } from "src/replicache/utils";
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

  setTimeout(async () => {
    //scroll to page

    scrollIntoViewIfNeeded(
      document.getElementById(elementId.page(pageID).container),
      false,
      "smooth",
    );

    // if we asked that the function focus the first block, focus the first block
    if (focusFirstBlock === "focusFirstBlock") {
      let firstBlock = await rep.query(async (tx) => {
        let type = await scanIndex(tx).eav(pageID, "page/type");
        let blocks = await scanIndex(tx).eav(
          pageID,
          type[0]?.data.value === "canvas" ? "canvas/block" : "card/block",
        );

        let firstBlock = blocks[0];

        if (!firstBlock) {
          return null;
        }

        let blockType = (
          await tx
            .scan<
              Fact<"block/type">
            >({ indexName: "eav", prefix: `${firstBlock.data.value}-block/type` })
            .toArray()
        )[0];

        if (!blockType) return null;

        return {
          value: firstBlock.data.value,
          type: blockType.data.value,
          parent: firstBlock.entity,
          position: firstBlock.data.position,
        };
      });

      if (firstBlock) {
        setTimeout(() => {
          focusBlock(firstBlock, { type: "start" });
        }, 500);
      }
    }
  }, 50);
}
