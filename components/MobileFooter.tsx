"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { TextToolbar } from "components/Toolbar";

export function MobileFooter(props: { entityID: string }) {
  let focusedTextBlock = useUIState((s) => s.focusedBlock);
  return (
    <Media mobile className="w-full z-10 -mt-6">
      {focusedTextBlock && focusedTextBlock.type == "block" ? (
        <div className="z-10 p-2 flex gap-[6px] items-center bg-bg-card ">
          <TextToolbar />
        </div>
      ) : (
        <div className="z-10 pb-2 px-2 flex gap-[6px] items-center justify-end">
          <ThemePopover entityID={props.entityID} />
        </div>
      )}
    </Media>
  );
}
