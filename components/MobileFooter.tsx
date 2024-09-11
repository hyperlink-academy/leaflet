"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { Toolbar } from "components/Toolbar";
import { ShareOptions } from "./ShareOptions";
import { HomeButton } from "./HomeButton";
import { useEntitySetContext } from "./EntitySetProvider";

export function MobileFooter(props: { entityID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let entity_set = useEntitySetContext();

  return (
    <Media mobile className="mobileFooter w-full z-10 touch-none">
      {focusedBlock &&
      focusedBlock.entityType == "block" &&
      entity_set.permissions.write ? (
        <div
          className="w-full z-10 p-2 flex bg-bg-page "
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) e.preventDefault();
          }}
        >
          <Toolbar
            pageID={focusedBlock.parent}
            blockID={focusedBlock.entityID}
          />
        </div>
      ) : (
        <div className="z-10 pb-2 px-2 flex justify-between">
          <HomeButton />
          <div className="flex flex-row gap-[6px] items-center ">
            <ThemePopover entityID={props.entityID} />
            <ShareOptions rootEntity={props.entityID} />
          </div>
        </div>
      )}
    </Media>
  );
}
