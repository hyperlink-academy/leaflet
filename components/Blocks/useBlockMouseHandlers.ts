import { useSelectingMouse } from "components/SelectionManager/selectionState";
import { MouseEvent, useCallback, useRef } from "react";
import { useUIState } from "src/useUIState";
import { Block } from "./Block";
import { isTextBlock } from "src/utils/isTextBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useReplicache } from "src/replicache";
import { getBlocksWithType } from "src/replicache/getBlocks";
import { focusBlock } from "src/utils/focusBlock";
import { useIsMobile } from "src/hooks/isMobile";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";
import { elementId } from "src/utils/elementId";

let debounce: number | null = null;
export function useBlockMouseHandlers(props: Block) {
  let entity_set = useEntitySetContext();
  let isMobile = useIsMobile();
  let { rep } = useReplicache();
  let onMouseDown = useCallback(
    (e: MouseEvent) => {
      if ((e.target as Element).getAttribute("data-draggable")) return;
      if ((e.target as Element).tagName === "BUTTON") return;
      if ((e.target as Element).tagName === "SELECT") return;
      if ((e.target as Element).tagName === "OPTION") return;
      if (isMobile) return;
      if (!entity_set.permissions.write) return;
      useSelectingMouse.setState({ start: props.value });
      if (e.shiftKey) {
        if (
          useUIState.getState().selectedBlocks[0]?.value === props.value &&
          useUIState.getState().selectedBlocks.length === 1
        )
          return;
        e.preventDefault();
        useUIState.getState().addBlockToSelection(props);
      } else {
        if (e.isDefaultPrevented()) return;
        useUIState.getState().setFocusedBlock({
          entityType: "block",
          entityID: props.value,
          parent: props.parent,
        });
        useUIState.getState().setSelectedBlock(props);

        // scroll to the page containing the block, if offscreen
        let parentPage = elementId.page(props.parent).container;
        setTimeout(() => {
          scrollIntoViewIfNeeded(
            document.getElementById(parentPage),
            false,
            "smooth",
          );
        }, 50);
      }
    },
    [props, entity_set.permissions.write, isMobile],
  );
  let onMouseEnter = useCallback(
    async (e: MouseEvent) => {
      if (isMobile) return;
      if (!entity_set.permissions.write) return;
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(async () => {
        debounce = null;
        if (e.buttons !== 1) return;
        let selection = useSelectingMouse.getState();
        if (!selection.start) return;
        let siblings =
          (await rep?.query((tx) => getBlocksWithType(tx, props.parent))) || [];
        let startIndex = siblings.findIndex((b) => b.value === selection.start);
        if (startIndex === -1) return;
        let endIndex = siblings.findIndex((b) => b.value === props.value);
        let start = Math.min(startIndex, endIndex);
        let end = Math.max(startIndex, endIndex);
        let selected = siblings.slice(start, end + 1).map((b) => ({
          value: b.value,
          position: b.position,
          parent: props.parent,
        }));
        useUIState.getState().setSelectedBlocks(selected);
      }, 15);
    },
    [rep, props, entity_set.permissions.write, isMobile],
  );
  return { onMouseDown, onMouseEnter };
}
