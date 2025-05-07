"use client";
import { Sidebar } from "components/ActionBar/Sidebar";
import { useEntitySetContext } from "components/EntitySetProvider";
import { HelpPopover } from "components/HelpPopover";
import { HomeButton } from "components/HomeButton";
import { usePublicationContext } from "components/Providers/PublicationContext";
import { ShareOptions } from "components/ShareOptions";
import { PublishToPublication } from "components/ShareOptions/PublicationOptions";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { Watermark } from "components/Watermark";
import { useUIState } from "src/useUIState";

export function LeafletSidebar(props: { leaflet_id: string }) {
  let entity_set = useEntitySetContext();
  let publication = usePublicationContext();
  return (
    <div
      className="spacer flex justify-end items-start"
      style={{ width: `calc(50vw - ((var(--page-width-units)/2))` }}
      onClick={(e) => {
        e.currentTarget === e.target && blurPage();
      }}
    >
      <Sidebar>
        {entity_set.permissions.write ? (
          <div className=" flex flex-col justify-center gap-2 mr-4">
            {publication.publication && (
              <div className="relative w-[30px] h-[76px]">
                <div className="origin-top-left -rotate-90 absolute translate-y-[76px]">
                  <PublishToPublication />
                </div>
              </div>
            )}
            <ShareOptions />
            <ThemePopover entityID={props.leaflet_id} />
            <HelpPopover />
            <hr className="text-border my-3" />
            <HomeButton />
          </div>
        ) : (
          <div>
            <HomeButton />
          </div>
        )}
        <Watermark />
      </Sidebar>
    </div>
  );
}

const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
