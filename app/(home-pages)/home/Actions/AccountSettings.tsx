"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { Popover } from "components/Popover";
import { ThemeSetterContent } from "components/ThemeManager/ThemeSetter";
import { useIsMobile } from "src/hooks/isMobile";
import { PaintSmall } from "components/Icons/PaintSmall";

export const AccountTheme = (props: { entityID: string }) => {
  let isMobile = useIsMobile();

  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className={`w-xs  bg-white!`}
      arrowFill="bg-white"
      trigger={<ActionButton smallOnMobile icon=<PaintSmall /> label="Theme" />}
    >
      <ThemeSetterContent entityID={props.entityID} home />
    </Popover>
  );
};
