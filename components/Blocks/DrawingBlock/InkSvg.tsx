import { memo } from "react";
import { InkStroke, ViewBox, inkColor, inkStrokePath } from "./ink";

// Fills its container's width at the view box's aspect ratio. Strokes past
// the view box still show: a collaborator's stroke can land before the view
// box grows to fit it.
export function InkSvg(props: {
  viewBox: ViewBox;
  strokes: { id: string; stroke: InkStroke }[];
  className?: string;
}) {
  let { x, y, width, height } = props.viewBox;
  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      overflow="visible"
      className={`block w-full h-auto ${props.className || ""}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {props.strokes.map((s) => (
        <InkPath key={s.id} stroke={s.stroke} />
      ))}
    </svg>
  );
}

export const InkPath = memo(function InkPath(props: {
  stroke: InkStroke;
  live?: boolean;
}) {
  return (
    <path
      d={inkStrokePath(props.stroke, !props.live)}
      fill={inkColor(props.stroke.color)}
    />
  );
});
