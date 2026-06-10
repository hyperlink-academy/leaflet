"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { Toolbar } from "./Toolbar";
import { FootnoteToolbar } from "./Toolbar/FootnoteToolbarWrapper";
import { useEntitySetContext } from "./EntitySetProvider";
import { focusBlock } from "src/utils/focusBlock";
import { hasBlockToolbar } from "app/(app)/[leaflet_id]/Footer";
import { useEntity } from "src/replicache";

export function DesktopPageFooter(props: { pageID: string; flow?: boolean }) {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let focusedBlockParentID =
    focusedEntity?.entityType === "page"
      ? focusedEntity.entityID
      : focusedEntity?.parent;
  let entity_set = useEntitySetContext();

  let blockType = useEntity(focusedEntity?.entityID || null, "block/type")?.data
    .value;

  let isFootnoteFocused =
    focusedEntity?.entityType === "footnote" &&
    focusedEntity.parent === props.pageID;

  return (
    <Media
      mobile={false}
      // In flow mode (publication page editor) the page sizes to its content
      // inside a shared ancestor scroller, so an absolutely-positioned footer
      // would scroll away with the document. Pin it to the screen instead.
      // In the carousel each page is viewport-height, so absolute-to-the-page
      // keeps it at the bottom of the visible page.
      className={
        props.flow
          ? "fixed inset-x-0 bottom-3 z-10 pointer-events-none"
          : "absolute bottom-[40px] left-0 right-0 z-10 pointer-events-none"
      }
    >
      {focusedEntity &&
        focusedEntity.entityType === "block" &&
        hasBlockToolbar(blockType) &&
        entity_set.permissions.write &&
        focusedBlockParentID === props.pageID && (
          <div
            className="pointer-events-auto w-fit mx-auto py-1 px-3 h-9 bg-bg-page border border-border rounded-full shadow-sm"
            onMouseDown={(e) => {
              if (e.currentTarget === e.target) e.preventDefault();
            }}
          >
            <Toolbar
              blockType={blockType}
              pageID={focusedBlockParentID}
              blockID={focusedEntity.entityID}
            />
          </div>
        )}
      {isFootnoteFocused && entity_set.permissions.write && (
        <div
          className="pointer-events-auto w-fit mx-auto py-1 px-3 h-9 bg-bg-page border border-border rounded-full shadow-sm"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) e.preventDefault();
          }}
        >
          <FootnoteToolbar pageID={props.pageID} />
        </div>
      )}
    </Media>
  );
}
