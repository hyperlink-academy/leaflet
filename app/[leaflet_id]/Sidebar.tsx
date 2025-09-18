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
import { useReplicache } from "src/replicache";

export function LeafletSidebar() {
  let entity_set = useEntitySetContext();
  let { rootEntity } = useReplicache();
  let { data: pub } = useLeafletPublicationData();
  let { identity } = useIdentityData();

  return (
    <Media mobile={false} className="w-0 h-full relative">
      <div
        className="absolute top-0 left-0  h-full flex justify-end "
        style={{ width: `calc(50vw - ((var(--page-width-units)/2))` }}
      >
        <div className="sidebarContainer flex flex-col justify-end h-full w-16 relative">
          {entity_set.permissions.write && (
            <Sidebar>
              {pub?.publications &&
              identity?.atp_did &&
              pub.publications.identity_did === identity.atp_did ? (
                <>
                  <PublishButton />
                  <ShareOptions />
                  <ThemePopover entityID={rootEntity} />
                  <HelpPopover />
                  <hr className="text-border" />
                  <BackToPubButton publication={pub.publications} />
                </>
              ) : (
                <>
                  <ShareOptions />
                  <ThemePopover entityID={rootEntity} />
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
        </div>
      </div>
    </Media>
  );
}

const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
