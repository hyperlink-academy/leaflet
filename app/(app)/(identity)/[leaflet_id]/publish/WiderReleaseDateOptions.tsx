"use client";
import { useEntity, useReplicache } from "src/replicache";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useSaveContentGateDefaults } from "components/Memberships/useSaveContentGateDefaults";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import {
  WIDER_RELEASE_DELAYS,
  getDocumentWiderRelease,
  isWiderReleaseDelay,
  isWiderReleasePassed,
  isWiderReleaseTimelinePast,
} from "src/membership";

// Shown under Publish Date when the post's gate is in early access. Edits the
// same timeline setting as the gate's options in the editor.
export function WiderReleaseDateOptions(props: {
  firstPage: string | undefined;
  // The publish date chosen on this page; undefined means now.
  publishedAt: Date | undefined;
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
  let { markChanged, save: saveDefaults } = useSaveContentGateDefaults(
    delimiter?.entityID ?? null,
  );
  // Publish keeps a release that has passed, so it can't be changed here.
  let { normalizedDocument } = useLeafletPublicationData();
  let publishedRelease = getDocumentWiderRelease(normalizedDocument);
  let passedAt =
    isWiderReleasePassed(publishedRelease)
      ? new Date(publishedRelease.at)
      : null;
  if (!delimiter || !isWiderReleaseDelay(timeline)) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center gap-2">
        <div className="text-tertiary">Wider Release</div>
        {passedAt ? (
          <div className="text-tertiary">
            Passed{" "}
            {passedAt.toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit",
            })}
          </div>
        ) : (
          <select
            className="text-secondary font-bold bg-transparent text-right hover:underline cursor-pointer"
            value={timeline}
            onChange={(e) => {
              if (!isWiderReleaseDelay(e.target.value)) return;
              rep?.mutate.assertFact({
                entity: delimiter.entityID,
                attribute: "block/members-only-wider-release-timeline",
                data: { type: "string", value: e.target.value },
              });
              markChanged();
            }}
            onBlur={saveDefaults}
          >
            {WIDER_RELEASE_DELAYS.map((d) => (
              <option
                key={d.value}
                value={d.value}
                disabled={isWiderReleaseTimelinePast(
                  props.publishedAt?.toISOString(),
                  d.value,
                )}
              >
                in {d.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
