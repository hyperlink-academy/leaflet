import React, { useState } from "react";
import { useUIState } from "src/useUIState";
import { ReplicacheMutators, useReplicache } from "src/replicache";
import { ToolbarButton } from "./index";
import { TrashSmall, CopySmall } from "components/Icons";
import { AreYouSure } from "components/Blocks/DeleteBlock";
import { copySelection } from "src/utils/copySelection";
import { useSmoker } from "components/Toast";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { Replicache } from "replicache";

export const MultiSelectToolbar = (props: {
  setToolbarState: (state: "areYouSure" | "multiselect") => void;
}) => {
  const { rep } = useReplicache();
  const smoker = useSmoker();

  const handleCopy = async (event: React.MouseEvent) => {
    if (!rep) return;
    const sortedSelection = await getSortedSelection(rep);
    await copySelection(rep, sortedSelection);
    smoker({
      position: { x: event.clientX, y: event.clientY },
      text: "Copied to clipboard",
    });
  };

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex items-center gap-2">
        <ToolbarButton
          tooltipContent="Delete Selected Blocks"
          onClick={() => {
            props.setToolbarState("areYouSure");
          }}
        >
          <TrashSmall />
        </ToolbarButton>
        <ToolbarButton
          tooltipContent="Copy Selected Blocks"
          onClick={handleCopy}
        >
          <CopySmall />
        </ToolbarButton>
        {/* Add more multi-select toolbar buttons here */}
      </div>
    </div>
  );
};

// Helper function to get sorted selection
async function getSortedSelection(rep: Replicache<ReplicacheMutators>) {
  const selectedBlocks = useUIState.getState().selectedBlocks;
  const siblings =
    (await rep?.query((tx) =>
      getBlocksWithType(tx, selectedBlocks[0].parent),
    )) || [];
  return siblings.filter((s) =>
    selectedBlocks.find((sb) => sb.value === s.value),
  );
}
