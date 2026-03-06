"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { Toolbar } from "./Toolbar";
import { useEntitySetContext } from "./EntitySetProvider";
import { focusBlock } from "src/utils/focusBlock";
import { hasBlockToolbar } from "app/[leaflet_id]/Footer";
import { useEntity } from "src/replicache";

export function DesktopPageFooter(props: { pageID: string }) {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let focusedBlockParentID =
    focusedEntity?.entityType === "page"
      ? focusedEntity.entityID
      : focusedEntity?.parent;
  let entity_set = useEntitySetContext();

  let blockType = useEntity(focusedEntity?.entityID || null, "block/type")?.data
    .value;

  return (
    <Media
      mobile={false}
      className="absolute bottom-[40px] w-full z-10 pointer-events-none"
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
    </Media>
  );
}
