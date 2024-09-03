"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { Toolbar } from "./Toolbar";

export function DesktopCardFooter(props: { cardID: string }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let focusedBlockParentID =
    focusedBlock?.entityType === "card"
      ? focusedBlock.entityID
      : focusedBlock?.parent;
  return (
    <Media
      mobile={false}
      className="absolute bottom-4 w-full z-10 pointer-events-none"
    >
      {focusedBlock &&
        focusedBlock.entityType === "block" &&
        focusedBlockParentID === props.cardID && (
          <div
            className="pointer-events-auto w-fit mx-auto py-1 px-3 h-9 bg-bg-card border border-border rounded-full shadow-sm"
            onMouseDown={(e) => {
              if (e.currentTarget === e.target) e.preventDefault();
            }}
          >
            <Toolbar
              cardID={focusedBlockParentID}
              blockID={focusedBlock.entityID}
            />
          </div>
        )}
    </Media>
  );
}
