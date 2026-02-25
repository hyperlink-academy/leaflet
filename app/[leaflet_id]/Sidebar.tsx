"use client";
import { Sidebar } from "components/ActionBar/Sidebar";
import { useEntitySetContext } from "components/EntitySetProvider";
import { HelpButton } from "app/[leaflet_id]/actions/HelpButton";
import { HomeButton } from "app/[leaflet_id]/actions/HomeButton";
import { Media } from "components/Media";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { ShareOptions } from "app/[leaflet_id]/actions/ShareOptions";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { PublishButton } from "./actions/PublishButton";
import { PostSettings } from "components/PostSettings";
import { Watermark } from "components/Watermark";
import { BackToPubButton } from "./actions/BackToPubButton";
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
              <PublishButton entityID={rootEntity} />
              <ShareOptions />
              <PostSettings />
              <ThemePopover entityID={rootEntity} />
              <HelpButton />
              <hr className="text-border" />
              {pub?.publications &&
              identity?.atp_did &&
              pub.publications.identity_did === identity.atp_did ? (
                <BackToPubButton publication={pub.publications} />
              ) : (
                <HomeButton />
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
