"use client";
import { useUIState } from "src/useUIState";
import { Footer as ActionFooter } from "components/ActionBar/Footer";
import { Media } from "components/Media";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { Toolbar } from "components/Toolbar";
import { ShareOptions } from "components/ShareOptions";
import { HomeButton } from "components/HomeButton";
import { useEntitySetContext } from "components/EntitySetProvider";
import { HelpPopover } from "components/HelpPopover";
import { Watermark } from "components/Watermark";
import { BackToPubButton, PublishButton } from "./Actions";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useIdentityData } from "components/IdentityProvider";

export function LeafletFooter(props: { entityID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let entity_set = useEntitySetContext();
  let { identity } = useIdentityData();
  let { data: pub } = useLeafletPublicationData();

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
        pub?.publications &&
        identity?.atp_did &&
        pub.publications.identity_did === identity.atp_did ? (
          <ActionFooter>
            <BackToPubButton publication={pub.publications} />
            <PublishButton />
            <ShareOptions />
            <HelpPopover />
          </ActionFooter>
        ) : (
          <ActionFooter>
            <HomeButton />
            <ShareOptions />
            <HelpPopover />
            <ThemePopover entityID={props.entityID} />
          </ActionFooter>
        )
      ) : (
        <div className="pb-2 px-2 z-10 flex justify-end">
          <Watermark mobile />
        </div>
      )}
    </Media>
  );
}
