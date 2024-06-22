"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { TextToolbar } from "./Toolbar";

export function DesktopFooter() {
  let focusedTextBlock = useUIState((s) => s.focusedBlock);
  return (
    <Media mobile={false} className="w-full flex gap-2 items-center z-10">
      <div className="flex flex-row gap-2">
        {focusedTextBlock && focusedTextBlock.type === "block" && (
          <TextToolbar />
        )}
      </div>
    </Media>
  );
}
