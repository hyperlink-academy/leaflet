"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { Toolbar } from "./Toolbar";
import { useEntitySetContext } from "./EntitySetProvider";

export function DesktopPageFooter(props: { pageID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let focusedBlockParentID =
    focusedBlock?.entityType === "page"
      ? focusedBlock.entityID
      : focusedBlock?.parent;
  let entity_set = useEntitySetContext();
  return (
    <Media
      mobile={false}
      className="absolute bottom-4 w-full z-10 pointer-events-none"
    >
      {focusedBlock &&
        focusedBlock.entityType === "block" &&
        entity_set.permissions.write &&
        focusedBlockParentID === props.pageID && (
          <div
            className="pointer-events-auto w-fit mx-auto py-1 px-3 h-9 bg-bg-page border border-border rounded-full shadow-sm"
            onMouseDown={(e) => {
              if (e.currentTarget === e.target) e.preventDefault();
            }}
          >
            <Toolbar
              pageID={focusedBlockParentID}
              blockID={focusedBlock.entityID}
            />
          </div>
        )}
    </Media>
  );
}
