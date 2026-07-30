"use client";
import { useUIState } from "src/useUIState";
import { FooterLayout } from "components/ActionBar/Footer";
import { Media } from "components/Media";
import { Toolbar } from "components/Toolbar";
import { FootnoteToolbar } from "components/Toolbar/FootnoteToolbarWrapper";
import { hasBlockToolbar } from "app/(app)/(identity)/[leaflet_id]/Footer";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useEntity } from "src/replicache";

// The pub page editor doesn't use LeafletFooter (no home/publish action bar —
// those live in PublicationEditHeader), so it needs its own mobile toolbar for
// the focused block. Sits at the bottom of the editor's flex column;
// ViewportSizeLayout keeps it above the iOS keyboard.
export function PublicationEditMobileFooter() {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let entity_set = useEntitySetContext();
  let blockType = useEntity(focusedEntity?.entityID || null, "block/type")?.data
    .value;

  if (!entity_set.permissions.write || !focusedEntity) return null;

  let toolbar =
    focusedEntity.entityType === "block" && hasBlockToolbar(blockType) ? (
      <Toolbar
        pageID={focusedEntity.parent}
        blockID={focusedEntity.entityID}
        blockType={blockType}
      />
    ) : focusedEntity.entityType === "footnote" ? (
      <FootnoteToolbar pageID={focusedEntity.parent} />
    ) : null;
  if (!toolbar) return null;

  return (
    <Media
      mobile
      className="pubEditMobileFooter pwa-padding-bottom w-full z-10 touch-none bg-bg-page"
    >
      <FooterLayout
        onMouseDown={(e) => {
          if (e.currentTarget === e.target) e.preventDefault();
        }}
      >
        {toolbar}
      </FooterLayout>
    </Media>
  );
}
