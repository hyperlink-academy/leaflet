"use client";
import { TooltipButton } from "./Buttons";
import { AddTiny } from "./Icons/AddTiny";
import { SubtractTiny } from "./Icons/SubtractTiny";
import { useCanvasZoom } from "src/canvasZoom/CanvasZoomProvider";

export function CanvasZoomControls(props: { className?: string }) {
  let { zoom, min, max, ready, locked, zoomIn, zoomOut, reset } =
    useCanvasZoom();
  let percent = Math.round(zoom * 100);
  if (locked) return null;
  return (
    <div
      className={`canvasZoomControls flex flex-row items-center gap-1 text-tertiary ${ready ? "" : "invisible"} ${props.className || ""}`}
    >
      <TooltipButton
        side="bottom"
        tooltipContent="Zoom out"
        disabled={zoom <= min}
        className="hover:text-accent-contrast disabled:text-border disabled:cursor-default"
        onMouseDown={zoomOut}
      >
        <SubtractTiny />
      </TooltipButton>
      <TooltipButton
        side="bottom"
        tooltipContent="Reset to 100%"
        className="text-sm tabular-nums w-10 text-center hover:text-accent-contrast"
        onMouseDown={reset}
      >
        {percent}%
      </TooltipButton>
      <TooltipButton
        side="bottom"
        tooltipContent="Zoom in"
        disabled={zoom >= max}
        className="hover:text-accent-contrast disabled:text-border disabled:cursor-default"
        onMouseDown={zoomIn}
      >
        <AddTiny />
      </TooltipButton>
    </div>
  );
}
