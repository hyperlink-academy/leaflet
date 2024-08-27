import React, { useState } from "react";
import { useUIState } from "src/useUIState";
import { useReplicache } from "src/replicache";
import { ToolbarButton } from "./index";
import { TrashSmall, CloseTiny, CopySmall } from "components/Icons";
import { AreYouSure } from "components/Blocks/DeleteBlock";
import { copySelection } from "src/utils/copySelection";
import { useSmoker } from "components/Toast";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";

export const MultiSelectToolbar = () => {
  const { rep } = useReplicache();
  const selectedBlocks = useUIState((s) => s.selectedBlock || []);
  const [areYouSure, setAreYouSure] = useState(false);
  const smoker = useSmoker();

  const handleDeleteBlocks = async () => {
    if (!rep) return;

    for (const blockID of selectedBlocks) {
      await rep.mutate.removeBlock({ blockEntity: blockID.value });
    }

    useUIState.setState({ selectedBlock: [] });
    setAreYouSure(false);
  };

  const handleClose = () => {
    useUIState.setState({ selectedBlock: [] });
  };

  const handleCopy = async (event: React.MouseEvent) => {
    if (!rep) return;
    const sortedSelection = await getSortedSelection();
    await copySelection(rep, sortedSelection);
    smoker({
      position: { x: event.clientX, y: event.clientY },
      text: "Copied to clipboard",
    });
  };

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex items-center gap-2">
        {areYouSure ? (
          <AreYouSure
            compact
            entityID={selectedBlocks.map((b) => b.value)}
            onClick={handleDeleteBlocks}
            closeAreYouSure={() => setAreYouSure(false)}
          />
        ) : (
          <>
            <ToolbarButton
              tooltipContent="Delete selected blocks"
              onClick={() => setAreYouSure(true)}
            >
              <TrashSmall />
            </ToolbarButton>
            <ToolbarButton
              tooltipContent="Copy selected blocks"
              onClick={handleCopy}
            >
              <CopySmall />
            </ToolbarButton>
          </>
        )}
        {/* Add more multi-select toolbar buttons here */}
      </div>
      {!areYouSure && (
        <button
          className="toolbarBackToDefault hover:text-accent-contrast"
          onClick={handleClose}
        >
          <CloseTiny />
        </button>
      )}
    </div>
  );
};

// Helper function to get sorted selection
async function getSortedSelection() {
  const { rep } = useReplicache();
  const selectedBlocks = useUIState.getState().selectedBlock;
  const siblings =
    (await rep?.query((tx) =>
      getBlocksWithType(tx, selectedBlocks[0].parent)
    )) || [];
  return siblings.filter((s) =>
    selectedBlocks.find((sb) => sb.value === s.value)
  );
}
