import {
  PointerActivationConstraint,
  PointerSensor,
  PointerSensorProps,
} from "@dnd-kit/core";
import { LONG_PRESS_DELAY, LONG_PRESS_TOLERANCE } from "src/hooks/useLongPress";
import { DRAG_HANDLE_ATTR, DragHandle } from "./ListDndState";

const activationConstraints: Record<DragHandle, PointerActivationConstraint> = {
  // The drag starts on whichever comes first: a 250ms hold (the OS
  // long-press timeout isn't exposed to the web; 250ms matches native
  // drag-lift timing and dnd-kit's recommended touch delay) or 8px of
  // pointer travel. A quick clean tap still falls through as a click.
  // dnd-kit reuses the one tolerance field as a movement-cancel in both
  // constraint branches, and checks it before the distance start — the
  // sentinel keeps any finite movement resolving as a drag start, never
  // a cancel.
  marker: { delay: 250, distance: 8, tolerance: Number.MAX_SAFE_INTEGER },
  // The body is also where taps, text selection and touch scrolling start,
  // so only a still hold lifts the block: the same hold that focuses it
  // through useLongPress, so the two land together.
  body: { delay: LONG_PRESS_DELAY, tolerance: LONG_PRESS_TOLERANCE },
};

// dnd-kit fixes the activation constraint per sensor and keeps one sensor per
// activator event, so a single pointer sensor serves both handles and picks
// the constraint from whichever handle the pointer went down on.
export class BlockDragSensor extends PointerSensor {
  constructor(props: PointerSensorProps) {
    let handle = (props.event.target as Element | null)
      ?.closest(`[${DRAG_HANDLE_ATTR}]`)
      ?.getAttribute(DRAG_HANDLE_ATTR) as DragHandle | null;
    super({
      ...props,
      options: {
        ...props.options,
        activationConstraint: activationConstraints[handle ?? "marker"],
      },
    });
  }
}
