import type { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";

type Rep = Replicache<ReplicacheMutators> | null | undefined;

export const toggleFold = (rep: Rep, entityID: string) => {
  if (useUIState.getState().foldedBlocks.includes(entityID))
    unfoldBlocks(rep, [entityID]);
  else foldBlocks(rep, [entityID]);
};

export const foldBlocks = (rep: Rep, entityIDs: string[]) => {
  let collapse = entityIDs.filter(
    (e) => !useUIState.getState().foldedBlocks.includes(e),
  );
  if (collapse.length > 0)
    rep?.mutate.toggleCollapsedBlocks({ collapse, ignoreUndo: true });
};

export const unfoldBlocks = (rep: Rep, entityIDs: string[]) => {
  let uncollapse = entityIDs.filter((e) =>
    useUIState.getState().foldedBlocks.includes(e),
  );
  if (uncollapse.length > 0)
    rep?.mutate.toggleCollapsedBlocks({ uncollapse, ignoreUndo: true });
};
