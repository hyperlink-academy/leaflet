import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useCallback } from "react";
import { useEntity, useReplicache } from "src/replicache";

export function TextAlignmentToolbar() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let { rep } = useReplicache();
  let setAlignment = useCallback(
    (alignment: "right" | "center" | "left") => {
      if (focusedBlock?.entityType === "page" || !focusedBlock) return null;
      rep?.mutate.assertFact({
        entity: focusedBlock?.entityID,
        attribute: "block/text-alignment",
        data: { type: "text-alignment-type-union", value: alignment },
      });
    },
    [focusedBlock, rep],
  );
  return (
    <div className="flex w-full justify-between items-center gap-4">
      <ToolbarButton
        onClick={() => setAlignment("left")}
        tooltipContent="Align Text Left"
      >
        left
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlignment("center")}
        tooltipContent="Align Text Center"
      >
        center
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlignment("right")}
        tooltipContent="Align Text Right"
      >
        right
      </ToolbarButton>
    </div>
  );
}

export function TextAlignmentButton(props: {
  setToolbarState: (s: "text-alignment") => void;
  className?: string;
}) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let alignment =
    useEntity(focusedBlock?.entityID || null, "block/text-alignment")?.data
      .value || "left";
  return (
    <ToolbarButton
      tooltipContent={<div>Text Size</div>}
      className={`${props.className}`}
      onClick={() => {
        props.setToolbarState("text-alignment");
      }}
    >
      {alignment}
    </ToolbarButton>
  );
}
