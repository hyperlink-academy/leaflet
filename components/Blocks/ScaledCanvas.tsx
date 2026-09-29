import type { ReactNode } from "react";
import type { CanvasSize } from "src/utils/embeddedCanvasSize";

// A drawing's canvas shown whole, scaled to the available width.
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

export function CanvasLinkPreview(props: { children: ReactNode }) {
  let pageWidth = `var(--page-width-unitless)`;
  return (
    <div
      style={{ contain: "size layout paint" }}
      className={`pageLinkBlockPreview shrink-0 h-[200px] w-full overflow-clip relative`}
    >
      <div
        className={`absolute top-0 left-0 origin-top-left pointer-events-none w-full`}
        style={{
          width: `calc(1px * ${pageWidth})`,
          height: "calc(1150px * 2)",
          transform: `scale(calc(((${pageWidth} - 36) / 1272 )))`,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
