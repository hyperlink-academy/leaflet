"use client";
import { ActionButton } from "components/ActionBar/ActionButton";
import { Sidebar } from "components/ActionBar/Sidebar";
import { useEntitySetContext } from "components/EntitySetProvider";
import { HelpPopover } from "components/HelpPopover";
import { HomeButton } from "components/HomeButton";
import { Media } from "components/Media";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { ShareOptions } from "components/ShareOptions";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { Watermark } from "components/Watermark";
import { useUIState } from "src/useUIState";
import { BackToPubButton, PublishButton } from "./Actions";

export function LeafletSidebar(props: { leaflet_id: string }) {
  let entity_set = useEntitySetContext();
  let { data: publicationData } = useLeafletPublicationData();
  let pub = publicationData?.[0];

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
        className="sidebarContainer relative flex flex-col justify-end h-full w-16 bg-bg-page/50  border-bg-page"
      >
        <Sidebar>
          {entity_set.permissions.write ? (
            pub?.publications ? (
              <>
                <PublishButton />
                <ShareOptions />
                <HelpPopover />
                <hr className="text-border" />
                <BackToPubButton publication={pub.publications} />
              </>
            ) : (
              <>
                <ShareOptions />
                <ThemePopover entityID={props.leaflet_id} />
                <HelpPopover />
                <hr className="text-border" />
                <HomeButton />
              </>
            )
          ) : (
            <div>
              <HomeButton />
            </div>
          )}
        </Sidebar>
        <div className="h-full pointer-events-none" />
        <Watermark />
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
