"use client";
import { v7 } from "uuid";
import { useEntity, useReplicache } from "src/replicache";

type AudienceAttribute =
  | "block/members-only-audience"
  | "questions/audience"
  | "reply/audience";
type TierAttribute =
  | "block/members-only-tier"
  | "questions/audience-tier"
  | "reply/audience-tier";

// Writes a block's audience and, for "tiers", syncs its tier facts to
// `tierIds` as one undo step. Tier facts are left alone for other audiences so
// switching back keeps the earlier selection.
export function useSetGatePolicy(
  entityID: string,
  audienceAttribute: AudienceAttribute,
  tierAttribute: TierAttribute,
) {
  let { rep, undoManager } = useReplicache();
  let tierFacts = useEntity(entityID, tierAttribute);
  let setAudience = (audience: string, tierIds: string[] = []) => {
    if (!rep) return;
    undoManager.withUndoGroup(async () => {
      await rep.mutate.assertFact({
        entity: entityID,
        attribute: audienceAttribute,
        data: { type: "string", value: audience },
      });
      if (audience !== "tiers") return;
      for (let fact of tierFacts)
        if (!tierIds.includes(fact.data.value))
          await rep.mutate.retractFact({ factID: fact.id });
      for (let id of tierIds)
        if (!tierFacts.some((f) => f.data.value === id))
          await rep.mutate.assertFact({
            id: v7(),
            entity: entityID,
            attribute: tierAttribute,
            data: { type: "string", value: id },
          });
    });
  };
  return { tierFacts, setAudience };
}
