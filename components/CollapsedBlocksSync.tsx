"use client";
import { useEffect, useRef, useState } from "react";
import { v7 } from "uuid";
import { useEntity, useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { useUIState } from "src/useUIState";

// Bridges the zustand foldedBlocks UI state with the signed-in user's
// root/collapsed-blocks fact, so fold state syncs across their devices via
// Replicache. The zustand store stays the synchronous source every editor
// call site reads and writes; this component seeds it from the fact and
// persists store changes back as collapse/uncollapse deltas against the
// user's single whole-state fact. Signed-out users keep the ephemeral
// store-only behavior.
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
  // The fact must seed the store before any store change may be persisted:
  // RouteUIStateManager resets foldedBlocks to [] on navigation, and writing
  // that reset back would wipe the user's saved state.
  let seeded = useRef(false);
  // Last value observed from the fact, so the outbound listener can tell a
  // user edit from the echo of an inbound write and skip no-op mutations.
  let factValue = useRef<string[]>([]);

  useEffect(() => {
    seeded.current = false;
  }, [rootEntity, did, rep]);

  // Inbound: fact -> store, on first load and on every synced change.
  useEffect(() => {
    if (!did) return;
    let value = JSON.parse(serialized) as string[];
    factValue.current = value;
    let apply = () => {
      if (!sameSet(useUIState.getState().foldedBlocks, value))
        useUIState.setState({ foldedBlocks: value });
      seeded.current = true;
    };
    if (seeded.current) {
      apply();
      return;
    }
    // First seed: RouteUIStateManager renders after the page in its layout, so
    // its route-change reset (foldedBlocks: []) flushes after this effect in
    // the same commit. Seed on a timeout so it lands after the reset instead
    // of being clobbered by it.
    let t = setTimeout(apply, 0);
    return () => clearTimeout(t);
  }, [serialized, did, rep, rootEntity]);

  // Outbound: store -> fact, for changes made after seeding. Each change is
  // persisted as the delta the user actually made (diffed against the previous
  // store state), not the whole set — deltas rebase over other clients'
  // concurrent toggles instead of clobbering them. ignoreUndo keeps fold
  // toggles out of the cmd-Z stack, matching the store-only behavior.
  useEffect(() => {
    if (!did || !rep) return;
    let r = rep;
    let authorDid = did;
    return useUIState.subscribe((state, prev) => {
      if (state.foldedBlocks === prev.foldedBlocks) return;
      if (!seeded.current) return;
      // Inbound echo: the store was just set to the fact's value.
      if (sameSet(state.foldedBlocks, factValue.current)) return;
      let collapse = state.foldedBlocks.filter(
        (b) => !prev.foldedBlocks.includes(b),
      );
      let uncollapse = prev.foldedBlocks.filter(
        (b) => !state.foldedBlocks.includes(b),
      );
      if (collapse.length === 0 && uncollapse.length === 0) return;
      factValue.current = [...state.foldedBlocks];
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

  return null;
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
