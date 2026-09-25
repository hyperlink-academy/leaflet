"use client";
import { useUIState } from "src/useUIState";
import { FooterLayout } from "components/ActionBar/Footer";
import { Media } from "components/Media";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { Toolbar } from "components/Toolbar";
import { FootnoteToolbar } from "components/Toolbar/FootnoteToolbarWrapper";
import { ShareOptions } from "app/(app)/(editor)/[leaflet_id]/actions/ShareOptions";
import {
  AddToHomeButton,
  HomeButton,
} from "app/(app)/(editor)/[leaflet_id]/actions/HomeButton";
import { PublishButton } from "./actions/PublishButton";
import { useEntitySetContext } from "components/EntitySetProvider";
import { Watermark } from "components/Watermark";
import { BackToPubButton } from "./actions/BackToPubButton";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useIdentityData } from "components/IdentityProvider";
import { useEntity, useReplicache } from "src/replicache";
import { PostSettings } from "components/PostSettings";
import { VersionHistory } from "./actions/VersionHistory";
import useSWR from "swr";
import { getHomeDocs } from "src/utils/homeDocsStorage";
import { useAddToHomeParam } from "./AddToHomeEffect";
import { pageOfParent } from "src/utils/blockGroups";

function hasBlockToolbar(blockType: string | null | undefined) {
  return (
    blockType === "text" ||
    blockType === "heading" ||
    blockType === "blockquote" ||
    blockType === "button" ||
    blockType === "datetime" ||
    blockType === "image"
  );
}

// Block types whose toolbar holds only controls that are hidden on canvas
// pages (ToolbarButton's hiddenOnCanvas), so it would render empty there.
const EMPTY_ON_CANVAS = new Set(["image"]);

// Whether the focused block gets a formatting toolbar. A multi-selection
// always does (the multiselect toolbar has its own actions).
export function useHasBlockToolbar(
  focusedEntity:
    | { entityType: string; entityID: string; parent?: string }
    | null
    | undefined,
) {
  let block = focusedEntity?.entityType === "block" ? focusedEntity : null;
  let blockType = useEntity(block?.entityID || null, "block/type")?.data.value;
  let pageType = useEntity(pageOfParent(block?.parent) || null, "page/type")
    ?.data.value;
  let isMultiselect = useUIState((s) => s.selectedBlocks.length > 1);
  if (!block || !hasBlockToolbar(blockType)) return false;
  if (isMultiselect) return true;
  return !(pageType === "canvas" && EMPTY_ON_CANVAS.has(blockType!));
}
export function LeafletFooter(props: { entityID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let entity_set = useEntitySetContext();
  let { identity } = useIdentityData();
  let { permission_token } = useReplicache();
  let { data: pub } = useLeafletPublicationData();
  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });
  let blockType = useEntity(focusedBlock?.entityID || null, "block/type")?.data
    .value;
  let showBlockToolbar = useHasBlockToolbar(focusedBlock);
  let addingToHome = useAddToHomeParam();
  let isOnHome =
    addingToHome ||
    (identity
      ? !!identity.permission_token_on_homepage.find(
          (pth) => pth.permission_tokens.id === permission_token.id,
        )
      : !!localLeaflets.find((f) => f.token.id === permission_token.id));
  let isOwnerOfPub =
    !!pub?.publications &&
    !!identity?.atp_did &&
    pub.publications.identity_did === identity.atp_did;
  let isContributorToPub =
    !!pub?.publications &&
    !!identity?.atp_did &&
    !!pub.publications.publication_contributors?.some(
      (c) => c.contributor_did === identity.atp_did && c.confirmed,
    );
  let canManagePubDraft = isOwnerOfPub || isContributorToPub;

  return (
    <Media
      mobile
      className="mobileLeafletFooter w-full z-10 touch-none -mt-[54px]"
    >
      {focusedBlock &&
      focusedBlock.entityType == "block" &&
      showBlockToolbar &&
      entity_set.permissions.write ? (
        <FooterLayout
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) e.preventDefault();
          }}
        >
          <Toolbar
            pageID={focusedBlock.parent}
            blockID={focusedBlock.entityID}
            blockType={blockType}
          />
        </FooterLayout>
      ) : focusedBlock &&
        focusedBlock.entityType === "footnote" &&
        entity_set.permissions.write ? (
        <FooterLayout
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) e.preventDefault();
          }}
        >
          <FootnoteToolbar pageID={focusedBlock.parent} />
        </FooterLayout>
      ) : entity_set.permissions.write ? (
        <FooterLayout>
          {canManagePubDraft && pub?.publications ? (
            <BackToPubButton publication={pub.publications} />
          ) : (
            <HomeButton />
          )}

          <div className="mobileLeafletActions flex gap-2 shrink-0">
            {canManagePubDraft || isOnHome ? (
              <PublishButton entityID={props.entityID} />
            ) : (
              <AddToHomeButton primary />
            )}

            <ShareOptions />
            <PostSettings />
            <VersionHistory />
            <ThemePopover entityID={props.entityID} />
          </div>
        </FooterLayout>
      ) : (
        <div className="pb-2 px-2 z-10 flex justify-end">
          <Watermark mobile />
        </div>
      )}
    </Media>
  );
}
