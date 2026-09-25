import type { CSSProperties, ReactNode } from "react";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";

// One-line page link row shared by the editor and the published post so the
// two stay visually identical; only how the title text is rendered differs.
export function CompactPageLink(props: {
  title: ReactNode | undefined;
  isHeading?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div
      style={{ "--list-marker-width": "20px" } as CSSProperties}
      className="pageLinkBlockCompact w-full flex items-center gap-2 pl-3 pr-2 py-2 text-sm"
    >
      <div
        className={`pageBlockOne grow min-w-0 ${props.isHeading ? "font-bold" : ""}`}
      >
        {props.title ?? <span className="text-tertiary italic">Untitled</span>}
      </div>
      {props.trailing}
      <ArrowRightTiny className="shrink-0 text-tertiary" />
    </div>
  );
}
