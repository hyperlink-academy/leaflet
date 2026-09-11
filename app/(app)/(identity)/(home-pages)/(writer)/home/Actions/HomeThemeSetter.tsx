"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { Popover } from "components/Popover";
import { useIsMobile } from "src/hooks/isMobile";
import { PaintSmall } from "components/Icons/PaintSmall";
import dynamic from "next/dynamic";

// The theme pickers render a live canvas preview, which reaches every block
// component; /home shouldn't pay for it until the popover opens.
const ThemeSetterContent = dynamic(
  () =>
    import("components/ThemeManager/ThemeSetter").then(
      (m) => m.ThemeSetterContent,
    ),
  { ssr: false },
);

export const HomeThemeSetter = (props: { entityID: string }) => {
  let isMobile = useIsMobile();
  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className={`w-xs bg-white!`}
      arrowFill="bg-white"
      trigger={
        <ActionButton
          secondary
          icon=<PaintSmall />
          label="Theme"
          className="sm:flex! hidden"
        />
      }
    >
      <ThemeSetterContent entityID={props.entityID} home />
    </Popover>
  );
};
