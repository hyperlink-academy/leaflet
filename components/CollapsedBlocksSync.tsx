"use client";
import { useEffect, useState } from "react";
import { v7 } from "uuid";
import { useEntity, useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { registerFoldPersister, useUIState } from "src/useUIState";

// Bridges the zustand foldedBlocks UI state with the signed-in user's
// root/collapsed-blocks fact, so fold state syncs across their devices via
// Replicache. The zustand store stays the synchronous source every editor
// call site reads and writes; this component seeds it from the fact and
// registers as the store's fold persister, so the store's own fold actions
// hand it the collapse/uncollapse delta they applied. Signed-out users keep
// the ephemeral store-only behavior.
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

  // Outbound: persist each user fold action as the delta it applied — deltas
  // rebase over other clients' concurrent toggles instead of clobbering them.
  // ignoreUndo keeps fold toggles out of the cmd-Z stack, matching the
  // store-only behavior.
  useEffect(() => {
    if (!did || !rep) return;
    let r = rep;
    let authorDid = did;
    return registerFoldPersister(({ collapse, uncollapse }) => {
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
