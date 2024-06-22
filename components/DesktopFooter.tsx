"use client";
import { useUIState } from "src/useUIState";
import { Media } from "./Media";
import { TextToolbar } from "./Toolbar";

export function DesktopFooter() {
  let focusedTextBlock = useUIState((s) => s.focusedBlock);
  return (
    <Media
      mobile={false}
      className=" absolute bottom-4 w-fit py-1 px-4 bg-bg-card flex gap-2 items-center border border-border rounded-full shadow-md z-10"
    >
      {focusedTextBlock && focusedTextBlock.type === "block" && <TextToolbar />}
    </Media>
  );
}
