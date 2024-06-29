"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { TextToolbar } from "./Toolbar";

export function DesktopCardFooter(props: { parentID: string }) {
  let focusedTextBlock = useUIState((s) => s.focusedBlock);
  let focusedBlockParent =
    focusedTextBlock?.type === "card" ? null : focusedTextBlock?.parent;
  return (
    <Media
      mobile={false}
      className="absolute bottom-4 w-full z-10 pointer-events-none"
    >
      {focusedTextBlock &&
        focusedTextBlock.type === "block" &&
        focusedBlockParent === props.parentID && (
          <div className="pointer-events-auto w-fit mx-auto py-1 px-3 bg-bg-card border border-border rounded-full shadow-sm">
            <TextToolbar />
          </div>
        )}
    </Media>
  );
}
