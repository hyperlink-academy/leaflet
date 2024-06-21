"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { TextToolbar } from "components/Toolbar";

export function MobileFooter(props: { entityID: string }) {
  let focusedTextBlock = useUIState((s) => s.focusedTextBlock);
  return (
    <Media
      mobile
      className="w-full flex gap-2 flex-row-reverse items-center z-10"
    >
      <div className="z-10 bg-bg-card py-2 flex gap-[6px] items-center w-full">
        {focusedTextBlock ? (
          <TextToolbar />
        ) : (
          <ThemePopover entityID={props.entityID} />
        )}
      </div>
    </Media>
  );
}
