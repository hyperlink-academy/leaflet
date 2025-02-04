import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useCallback } from "react";
import { useEntity, useReplicache } from "src/replicache";
import {
  AlignCenterSmall,
  AlignLeftSmall,
  AlignRightSmall,
} from "components/Icons";

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
    <>
      <ToolbarButton
        onClick={() => setAlignment("left")}
        tooltipContent="Align Left"
      >
        <AlignLeftSmall />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlignment("center")}
        tooltipContent="Align Center"
      >
        <AlignCenterSmall />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlignment("right")}
        tooltipContent="Align Right"
      >
        <AlignRightSmall />
      </ToolbarButton>
    </>
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
      hiddenOnCanvas
      tooltipContent={<div>Align</div>}
      className={`${props.className}`}
      onClick={() => {
        props.setToolbarState("text-alignment");
      }}
    >
      {alignment === "left" ? (
        <AlignLeftSmall />
      ) : alignment === "center" ? (
        <AlignCenterSmall />
      ) : (
        <AlignRightSmall />
      )}
    </ToolbarButton>
  );
}
