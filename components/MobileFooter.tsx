"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { Toolbar } from "components/Toolbar";
import { ShareOptions } from "./ShareOptions";
import { HomeButton } from "./HomeButton";
import { useEntitySetContext } from "./EntitySetProvider";
import { HelpPopover } from "./HelpPopover";
import { Watermark } from "./Watermark";
import { PublishToPublication } from "./ShareOptions/PublicationOptions";

export function MobileFooter(props: { entityID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let entity_set = useEntitySetContext();

  return (
    <Media mobile className="mobileFooter w-full z-10 touch-none -mt-4 ">
      {focusedBlock &&
      focusedBlock.entityType == "block" &&
      entity_set.permissions.write ? (
        <div
          className="w-full z-10 p-2 flex bg-bg-page pwa-padding-bottom"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) e.preventDefault();
          }}
        >
          <Toolbar
            pageID={focusedBlock.parent}
            blockID={focusedBlock.entityID}
          />
        </div>
      ) : entity_set.permissions.write ? (
        <div className="z-10 pwa-padding-bottom px-2 pt-0.5 flex justify-between">
          <div className="flex flex-row gap-[6px]">
            <HomeButton />
          </div>
          <div className="flex flex-row gap-[6px] items-center ">
            <HelpPopover />
            <ThemePopover entityID={props.entityID} />
            <ShareOptions />
            <PublishToPublication />
          </div>
        </div>
      ) : (
        <div className="pb-2 px-2 z-10 flex justify-end">
          <Watermark mobile />
        </div>
      )}
    </Media>
  );
}
