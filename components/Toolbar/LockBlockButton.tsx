import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useEntity, useReplicache } from "src/replicache";
import { LockSmall, UnlockSmall } from "components/Icons";
import { focusBlock } from "src/utils/focusBlock";

export function LockBlockButton() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let type = useEntity(focusedBlock?.entityID || null, "block/type");
  let locked = useEntity(focusedBlock?.entityID || null, "block/is-locked");
  let { rep } = useReplicache();
  if (focusedBlock?.entityType !== "block") return;
  return (
    <ToolbarButton
      onClick={async () => {
        if (!locked?.data.value)
          rep?.mutate.assertFact({
            entity: focusedBlock.entityID,
            attribute: "block/is-locked",
            data: { value: true, type: "boolean" },
          });
        else {
          await rep?.mutate.retractFact({ factID: locked.id });
        }
        type &&
          focusBlock(
            {
              type: type.data.value,
              parent: focusedBlock.parent,
              value: focusedBlock.entityID,
            },
            { type: "end" },
          );
      }}
      tooltipContent={
        <span>{!locked?.data.value ? "Lock Editing" : " Unlock Editing"}</span>
      }
    >
      {!locked?.data.value ? <LockSmall /> : <UnlockSmall />}
    </ToolbarButton>
  );
}
