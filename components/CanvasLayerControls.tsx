"use client";
import { useReplicache } from "src/replicache";
import { useCanvasPaintOrder } from "src/hooks/queries/useCanvasStacking";
import { TooltipButton } from "./Buttons";
import { BringForwardTiny } from "./Icons/BringForwardTiny";
import { SendBackwardTiny } from "./Icons/SendBackwardTiny";
import { SendToFrontTiny } from "./Icons/SendToFrontTiny";
import { SendToBackTiny } from "./Icons/SendToBackTiny";

// Stacking controls for one canvas block, rendered inside a block's options
// bar in place of the document up/down buttons.
export function CanvasLayerControls(props: {
  parent: string;
  entityID: string;
}) {
  let { rep } = useReplicache();
  let order = useCanvasPaintOrder(props.parent);
  let index = order.indexOf(props.entityID);
  let atFront = index === order.length - 1;
  let atBack = index === 0;

  let controls = [
    {
      action: "backward",
      label: "Send Backward",
      icon: <SendBackwardTiny />,
      disabled: atBack,
    },
    {
      action: "forward",
      label: "Bring Forward",
      icon: <BringForwardTiny />,
      disabled: atFront,
    },
    {
      action: "back",
      label: "Send to Back",
      icon: <SendToBackTiny />,
      disabled: atBack,
    },
    {
      action: "front",
      label: "Bring to Front",
      icon: <SendToFrontTiny />,
      disabled: atFront,
    },
  ] as const;

  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {controls.map((c) => (
        <TooltipButton
          key={c.action}
          tooltipContent={c.label}
          disabled={c.disabled}
          className="disabled:opacity-40"
          // TooltipButton's undo group makes the first layering on a canvas,
          // which writes a fact per block, one Cmd-Z.
          onMouseDown={() =>
            rep?.mutate.moveCanvasBlockLayer({
              parent: props.parent,
              entityID: props.entityID,
              action: c.action,
            })
          }
        >
          {c.icon}
        </TooltipButton>
      ))}
    </div>
  );
}
