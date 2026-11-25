"use client";
import { useRef } from "react";
import { saveContentGateDefaults } from "actions/publications/saveContentGateDefaults";
import { toContentGateDefaults } from "src/publicationDefaults";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useEntity } from "src/replicache";
import {
  isWiderReleaseDelay,
  type AudiencePolicy,
  type GatePolicy,
} from "src/membership";

// Remembers a gate's options as the publication's defaults, so the next gate
// added starts from the same choices. Call `markChanged` on each edit and
// `save` when the editing surface closes: saving once from the settled facts
// keeps rapid edits from landing out of order.
export function useSaveContentGateDefaults(entityID: string | null) {
  let { data: pub, mutate } = useLeafletPublicationData();
  let audience = useEntity(entityID, "block/members-only-audience")?.data.value;
  let tierFacts = useEntity(entityID, "block/members-only-tier");
  let timeline = useEntity(
    entityID,
    "block/members-only-wider-release-timeline",
  )?.data.value;
  let widerAudience = useEntity(
    entityID,
    "block/members-only-wider-release-audience",
  )?.data.value;
  let changed = useRef(false);

  let save = () => {
    let publicationUri = pub?.publications?.uri;
    if (!changed.current || !publicationUri) return;
    changed.current = false;
    let gate: GatePolicy =
      audience === "subscribers" || audience === "paid"
        ? { audience }
        : {
            audience: "tiers",
            tierIds: [...new Set(tierFacts.map((f) => f.data.value))],
          };
    let release = (widerAudience as AudiencePolicy | undefined) ?? {
      audience: "public",
    };
    let defaults = toContentGateDefaults({
      audience: gate,
      widerRelease: isWiderReleaseDelay(timeline)
        ? {
            timeline,
            audience:
              release.audience === "tiers"
                ? { audience: "tiers", tierIds: [...release.tierIds] }
                : release,
          }
        : null,
    });
    saveContentGateDefaults(publicationUri, defaults)
      .then(() => mutate())
      .catch((error) =>
        console.error("[gate] saving publication defaults failed", error),
      );
  };

  return {
    markChanged: () => {
      changed.current = true;
    },
    save,
  };
}
