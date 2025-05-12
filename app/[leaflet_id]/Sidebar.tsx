"use client";
import { Sidebar } from "components/ActionBar/Sidebar";
import { useEntitySetContext } from "components/EntitySetProvider";
import { HelpPopover } from "components/HelpPopover";
import { HomeButton } from "components/HomeButton";
import { Media } from "components/Media";
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
      <Media
        mobile={false}
        className="sidebarContainer relative flex flex-col justify-between h-full w-16 bg-bg-page/50  border-bg-page"
      >
        <Sidebar>
          {entity_set.permissions.write ? (
            <>
              <ShareOptions />
              <ThemePopover entityID={props.leaflet_id} />
              <HelpPopover />
              <hr className="text-border" />
              <HomeButton />
            </>
          ) : (
            <div>
              <HomeButton />
            </div>
          )}
        </Sidebar>
        <div className="justify-end justify-self-end">
          <Watermark />
        </div>
      </Media>
    </div>
  );
}

const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
