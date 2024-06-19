"use client";
import { Media } from "./Media";
import { ThemePopover } from "./ThemeManager/ThemeSetter";

export function MobileFooter(props: { entityID: string }) {
  return (
    <Media
      mobile
      className="w-full pb-2 px-2 -mt-6 flex gap-2 flex-row-reverse items-center z-10"
    >
      <ThemePopover entityID={props.entityID} />
    </Media>
  );
}
