import { createContext, useContext } from "react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { create } from "zustand";
import { combine } from "zustand/middleware";

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
  // A folded block the drop lands directly inside or after (a collapsed new
  // parent, or a folded heading's section); it must be unfolded on drop so
  // the moved block doesn't disappear into its hidden content.
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
