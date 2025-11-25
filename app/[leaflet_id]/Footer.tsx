"use client";
import { useUIState } from "src/useUIState";
import { Footer as ActionFooter } from "components/ActionBar/Footer";
import { Media } from "components/Media";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { Toolbar } from "components/Toolbar";
import { ShareOptions } from "app/[leaflet_id]/actions/ShareOptions";
import { HomeButton } from "app/[leaflet_id]/actions/HomeButton";
import { PublishButton } from "./actions/PublishButton";
import { useEntitySetContext } from "components/EntitySetProvider";
import { HelpButton } from "app/[leaflet_id]/actions/HelpButton";
import { Watermark } from "components/Watermark";
import { BackToPubButton } from "./actions/BackToPubButton";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useIdentityData } from "components/IdentityProvider";

export function LeafletFooter(props: { entityID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let entity_set = useEntitySetContext();
  let { identity } = useIdentityData();
  let { data: pub } = useLeafletPublicationData();

  return (
    <Media mobile className="mobileFooter w-full z-10 touch-none -mt-[54px] ">
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
        <ActionFooter>
          {pub?.publications &&
          identity?.atp_did &&
          pub.publications.identity_did === identity.atp_did ? (
            <BackToPubButton publication={pub.publications} />
          ) : (
            <HomeButton />
          )}

          <PublishButton entityID={props.entityID} />
          <ShareOptions />
          <ThemePopover entityID={props.entityID} />
        </ActionFooter>
      ) : (
        <div className="pb-2 px-2 z-10 flex justify-end">
          <Watermark mobile />
        </div>
      )}
    </Media>
  );
}
