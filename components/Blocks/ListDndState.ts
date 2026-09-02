import { createContext, useContext } from "react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import type { Block } from "components/Blocks/Block";

// Every mounted page's visible block list, so the drag handlers (which live
// in one ListDndProvider above all open pages) can resolve which page a
// droppable belongs to and compute drops across pages. Written from each
// Blocks render via effect; read only inside drag event handlers.
export type ListDndPage = {
  pageID: string;
  blocks: Block[];
  zoomDepth?: number;
};
const pageRegistry = new Map<string, ListDndPage>();
export const registerListDndPage = (page: ListDndPage) => {
  pageRegistry.set(page.pageID, page);
};
export const unregisterListDndPage = (pageID: string) => {
  pageRegistry.delete(pageID);
};
export const findListDndPageForBlock = (
  entityID: string,
): ListDndPage | undefined => {
  for (let page of pageRegistry.values())
    if (page.blocks.some((b) => b.entityID === entityID)) return page;
};

// Where a dragged list item would land: enough to render the indicator line
// (entityID + edge + depth) and to apply the move on drop (newParent + position).
export type ListDropTarget = {
  entityID: string;
  edge: "top" | "bottom";
  depth: number;
  newParent: string;
  position:
    | { type: "first" }
    | { type: "before"; entity: string }
    | { type: "after"; entity: string };
  // Present when the drop lands one level above the list run below the line:
  // the children of `parent` from `from` onward are adopted under the dropped
  // block (a list split, keeping the run's rendered depth).
  adopt?: { parent: string; from: string };
  // A folded block the drop lands directly inside or after (a collapsed new
  // parent, a folded heading's section, or the dragged block itself when it
  // adopts a run); it must be unfolded on drop so nothing disappears into
  // hidden content.
  unfold?: string;
};

// Blocks subscribe with primitive-returning selectors so only the dragged
// subtree and the block carrying the indicator re-render during a drag.
export const useListDragState = create(
  combine(
    {
      activeId: null as string | null,
      dropTarget: null as ListDropTarget | null,
    },
    () => ({}),
  ),
);

// Handed from Block (which owns the useDraggable registration, so the drag
// rect is the whole block row) down to the ListMarker that acts as the handle.
export const ListDragHandleContext = createContext<null | {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
}>(null);
export const useListDragHandle = () => useContext(ListDragHandleContext);

// The browser fires a click on the handle after a drop; the marker's own
// click action (fold toggle) needs a way to ignore it.
let lastDragEndedAt = 0;
export const markListDragEnd = () => {
  lastDragEndedAt = Date.now();
};
export const didListDragJustEnd = () => Date.now() - lastDragEndedAt < 250;
