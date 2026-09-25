import type { ReactNode } from "react";
import type { CanvasSize } from "src/utils/embeddedCanvasSize";

// A drawing's canvas shown whole, scaled to the available width. Shared by
// the editor's block and the published post so both frame it identically.
export function ScaledCanvas(props: {
  size: CanvasSize;
  inert?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      inert={props.inert}
      className="relative w-full overflow-clip"
      style={{
        aspectRatio: `${props.size.width} / ${props.size.height}`,
        containerType: "inline-size",
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: props.size.width,
          height: props.size.height,
          transform: `scale(tan(atan2(100cqw, ${props.size.width}px)))`,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
