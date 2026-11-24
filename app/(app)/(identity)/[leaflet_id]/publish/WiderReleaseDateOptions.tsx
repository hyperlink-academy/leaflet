"use client";
import { useEntity, useReplicache } from "src/replicache";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { WIDER_RELEASE_DELAYS, isWiderReleaseDelay } from "src/membership";

// Shown under Publish Date when the post's gate is in early access. Edits the
// same timeline setting as the gate's options in the editor.
export function WiderReleaseDateOptions(props: {
  firstPage: string | undefined;
}) {
  let { rep } = useReplicache();
  let delimiter = useBlocks(props.firstPage ?? null).find(
    (b) => b.type === "members-only-delimiter",
  );
  let timelineFact = useEntity(
    delimiter?.entityID ?? null,
    "block/members-only-wider-release-timeline",
  );
  let timeline = timelineFact?.data.value;
  if (!delimiter || !isWiderReleaseDelay(timeline)) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center gap-2">
        <div className="text-tertiary">Wider Release</div>
        <select
          className="text-secondary font-bold bg-transparent text-right hover:underline cursor-pointer"
          value={timeline}
          onChange={(e) => {
            if (isWiderReleaseDelay(e.target.value))
              rep?.mutate.assertFact({
                entity: delimiter.entityID,
                attribute: "block/members-only-wider-release-timeline",
                data: { type: "string", value: e.target.value },
              });
          }}
        >
          {WIDER_RELEASE_DELAYS.map((d) => (
            <option key={d.value} value={d.value}>
              in {d.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
