import {
  ImageFullBleedOffSmall,
  ImageFullBleedOnSmall,
  LinkSmall,
} from "components/Icons";
import { ToolbarButton } from ".";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";

export const ImageFullBleedButton = (props: {}) => {
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedEntity)?.entityID || null;
  let isFullBleed = useEntity(focusedBlock, "image/full-bleed")?.data.value;

  return (
    <ToolbarButton
      hiddenOnCanvas
      active={isFullBleed}
      onClick={async (e) => {
        e.preventDefault();
        if (rep && focusedBlock) {
          await rep.mutate.assertFact({
            entity: focusedBlock,
            attribute: "image/full-bleed",
            data: { type: "boolean", value: !isFullBleed },
          });
        }
      }}
      tooltipContent={<div className="">Toggle Full Bleed</div>}
    >
      {isFullBleed ? <ImageFullBleedOnSmall /> : <ImageFullBleedOffSmall />}
    </ToolbarButton>
  );
};
