"use client";
import { useEffect, useState } from "react";
import { v7 } from "uuid";
import { useEntity, useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { registerFoldMutator, useUIState } from "src/useUIState";

// Puts the signed-in user's fold state on the standard Replicache flow: the
// store's fold actions dispatch their collapse/uncollapse delta as a mutation
// against the user's root/collapsed-blocks fact (via the mutator registered
// here), and the fact syncs back into the zustand store, which every editor
// call site keeps reading synchronously as a mirror. Signed-out users keep
// the ephemeral store-only behavior — nothing is registered, so the actions
// write the store directly.
export function CollapsedBlocksSync() {
  let { rep, rootEntity, permission_token } = useReplicache();
  let { identity } = useIdentityData();
  // Requires write rights, not just a signed-in did: a read-only token's
  // writes are dropped server-side, so the optimistic fold would revert on the
  // next pull — the ephemeral store behaves better for those viewers.
  let canWrite = permission_token.permission_token_rights?.some((r) => r.write);
  let did = (canWrite && identity?.atp_did) || null;
  let facts = useEntity(did ? rootEntity : null, "root/collapsed-blocks");
  let mine = did ? facts.find((f) => f.author_did === did) : undefined;
  let serialized = JSON.stringify(mine?.data.value ?? []);

  // The fact's id is reused for every re-create in this session (collapse →
  // unfold-all retracts the fact → collapse again), keeping client and server
  // fact ids in agreement.
  let [factID] = useState(() => v7());

  // Outbound: each fold action becomes the delta the user intended — deltas
  // rebase over other clients' concurrent toggles instead of clobbering them.
  // ignoreUndo keeps fold toggles out of the cmd-Z stack, matching the
  // store-only behavior.
  useEffect(() => {
    if (!did || !rep) return;
    let r = rep;
    let authorDid = did;
    return registerFoldMutator(({ collapse, uncollapse }) => {
      r.mutate.toggleCollapsedBlocks({
        rootEntity,
        authorDid,
        factID,
        collapse,
        uncollapse,
        ignoreUndo: true,
      });
    });
  }, [rep, did, rootEntity, factID]);

  // Inbound: fact -> store, on mount and on every synced change. A whole
  // replace, so state left over from a previous doc is cleared even when the
  // fact is empty.
  useEffect(() => {
    if (!did) return;
    let value = JSON.parse(serialized) as string[];
    if (!sameSet(useUIState.getState().foldedBlocks, value))
      useUIState.setState({ foldedBlocks: value });
  }, [serialized, did, rep, rootEntity]);

  return null;
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
