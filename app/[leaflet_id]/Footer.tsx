"use client";
import { useUIState } from "src/useUIState";
import { Footer } from "components/ActionBar/Footer";
import { Media } from "components/Media";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { Toolbar } from "components/Toolbar";
import { ShareOptions } from "app/[leaflet_id]/actions/ShareOptions";
import { HomeButton } from "app/[leaflet_id]/actions/HomeButton";
import { PublishButton } from "./actions/PublishButton";
import { useEntitySetContext } from "components/EntitySetProvider";
import { Watermark } from "components/Watermark";
import { BackToPubButton } from "./actions/BackToPubButton";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useIdentityData } from "components/IdentityProvider";
import { useEntity } from "src/replicache";
import { block } from "sharp";
import { PostSettings } from "components/PostSettings";

export function hasBlockToolbar(blockType: string | null | undefined) {
  return (
    blockType === "text" ||
    blockType === "heading" ||
    blockType === "blockquote" ||
    blockType === "button" ||
    blockType === "datetime" ||
    blockType === "image"
  );
}
export function LeafletFooter(props: { entityID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);

  let entity_set = useEntitySetContext();
  let { identity } = useIdentityData();
  let { data: pub } = useLeafletPublicationData();
  let blockType = useEntity(focusedBlock?.entityID || null, "block/type")?.data
    .value;

  return (
    <Media
      mobile
      className="mobileLeafletFooter w-full z-10 touch-none -mt-[54px] "
    >
      {focusedBlock &&
      focusedBlock.entityType == "block" &&
      hasBlockToolbar(blockType) &&
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
            blockType={blockType}
          />
        </div>
      ) : entity_set.permissions.write ? (
        <Footer>
          {pub?.publications &&
          identity?.atp_did &&
          pub.publications.identity_did === identity.atp_did ? (
            <BackToPubButton publication={pub.publications} />
          ) : (
            <HomeButton />
          )}
          <div className="mobileLeafletActions flex gap-2 shrink-0">
            <PublishButton entityID={props.entityID} />
            <ShareOptions />
            <PostSettings />
            <ThemePopover entityID={props.entityID} />
          </div>
        </Footer>
      ) : (
        <div className="pb-2 px-2 z-10 flex justify-end">
          <Watermark mobile />
        </div>
      )}
    </Media>
  );
}
