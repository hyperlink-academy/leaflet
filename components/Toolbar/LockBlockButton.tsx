import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useEntity, useReplicache } from "src/replicache";
import { LockSmall, UnlockSmall } from "components/Icons";

export function LockBlockButton() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let locked = useEntity(focusedBlock?.entityID || null, "block/is-locked");
  let { rep } = useReplicache();
  if (focusedBlock?.entityType !== "block") return;
  return (
    <ToolbarButton
      onClick={() => {
        if (!locked?.data.value)
          rep?.mutate.assertFact({
            entity: focusedBlock.entityID,
            attribute: "block/is-locked",
            data: { value: true, type: "boolean" },
          });
        else {
          rep?.mutate.retractFact({ factID: locked.id });
        }
      }}
      tooltipContent={
        <span>{!locked?.data.value ? "Lock Editing" : " Unlock Editing"}</span>
      }
    >
      {!locked?.data.value ? <LockSmall /> : <UnlockSmall />}
    </ToolbarButton>
  );
}
