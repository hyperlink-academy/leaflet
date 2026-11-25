"use client";
import { saveContentGateDefaults } from "actions/publications/saveContentGateDefaults";
import { toContentGateDefaults } from "src/publicationDefaults";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useEntity } from "src/replicache";
import {
  isWiderReleaseDelay,
  type AudiencePolicy,
  type GatePolicy,
  type WiderReleaseDelay,
} from "src/membership";

type GateChange = {
  audience?: GatePolicy;
  // Null switches the gate to Unlock Content.
  timeline?: WiderReleaseDelay | null;
  widerReleaseAudience?: AudiencePolicy;
};

// Remembers a gate's options as the publication's defaults whenever the
// author changes them, so the next gate added starts from the same choices.
// Takes the change explicitly because the facts it reads haven't caught up
// with the mutation yet.
export function useSaveContentGateDefaults(entityID: string | null) {
  let { data: pub } = useLeafletPublicationData();
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

  return (change: GateChange) => {
    let publicationUri = pub?.publications?.uri;
    if (!publicationUri) return;
    let gate: GatePolicy =
      change.audience ??
      (audience === "subscribers" || audience === "paid"
        ? { audience }
        : {
            audience: "tiers",
            tierIds: [...new Set(tierFacts.map((f) => f.data.value))],
          });
    let nextTimeline =
      change.timeline !== undefined
        ? change.timeline
        : isWiderReleaseDelay(timeline)
          ? timeline
          : null;
    let release = change.widerReleaseAudience ??
      (widerAudience as AudiencePolicy | undefined) ?? { audience: "public" };
    saveContentGateDefaults(
      publicationUri,
      toContentGateDefaults({
        audience: gate,
        widerRelease: nextTimeline
          ? {
              timeline: nextTimeline,
              audience:
                release.audience === "tiers"
                  ? { audience: "tiers", tierIds: [...release.tierIds] }
                  : release,
            }
          : null,
      }),
    ).catch((error) =>
      console.error("[gate] saving publication defaults failed", error),
    );
  };
}
