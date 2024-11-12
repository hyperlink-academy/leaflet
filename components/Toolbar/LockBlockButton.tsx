import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useEntity, useReplicache } from "src/replicache";

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
        <span>
          You can lock a block to prevent editing it without unlocking it first
        </span>
      }
    >
      {!locked?.data.value ? "lock" : "unlock"}
    </ToolbarButton>
  );
}
