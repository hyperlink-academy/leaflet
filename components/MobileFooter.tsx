"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { TextToolbar } from "components/Toolbar";

export function MobileFooter(props: { entityID: string }) {
  let focusedBlock = useUIState((s) => s.focusedBlock);

  return (
    <Media mobile className="w-full z-10 -mt-6">
      {focusedBlock && focusedBlock.type == "block" ? (
        <div className="w-full z-10 p-2 flex bg-bg-card ">
          <TextToolbar
            cardID={focusedBlock.parent}
            blockID={focusedBlock.entityID}
          />
        </div>
      ) : (
        <div className="z-10 pb-2 px-2 flex gap-[6px] items-center justify-end">
          <ThemePopover entityID={props.entityID} />
        </div>
      )}
    </Media>
  );
}
