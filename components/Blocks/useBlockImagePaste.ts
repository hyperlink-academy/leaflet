import { useEffect, useRef } from "react";
import { useUIState } from "src/useUIState";

export function useBlockImagePaste(
  entityID: string,
  enabled: boolean,
  onFiles: (files: File[]) => void,
) {
  let onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;
  useEffect(() => {
    if (!enabled) return;
    let onPaste = (e: ClipboardEvent) => {
      let focused = useUIState.getState().focusedEntity;
      if (focused?.entityType !== "block" || focused.entityID !== entityID)
        return;
      let active = document.activeElement;
      if (
        e.defaultPrevented ||
        (active instanceof HTMLElement &&
          (active.isContentEditable ||
            active.matches("input:not([type=file]), textarea, select")))
      )
        return;
      let files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      e.preventDefault();
      onFilesRef.current(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enabled, entityID]);
}
