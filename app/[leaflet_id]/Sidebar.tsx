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
import { useIdentityData } from "components/IdentityProvider";

export function LeafletSidebar(props: { leaflet_id: string }) {
  let entity_set = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();
  let { identity } = useIdentityData();

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
        className="sidebarContainer relative flex flex-col justify-end h-full w-16"
      >
        {entity_set.permissions.write && (
          <Sidebar>
            {pub?.publications &&
            identity?.atp_did &&
            pub.publications.identity_did === identity.atp_did ? (
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
            )}
          </Sidebar>
        )}
        <div className="h-full flex items-end">
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
