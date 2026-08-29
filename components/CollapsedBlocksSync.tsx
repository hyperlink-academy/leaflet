"use client";
import { useEffect, useLayoutEffect } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { useUIState } from "src/useUIState";

// Applies fold state before the browser paints, and is server-render safe
// (useLayoutEffect warns and never runs during SSR).
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function CollapsedBlocksSync(props: {
  // Server-resolved fold state for the session's viewer, so a hard load
  // respects it on first paint instead of waiting for the client-side
  // identity fetch; once identity resolves the fact takes over.
  initialFoldedBlocks?: string[];
}) {
  let { rootEntity, permission_token } = useReplicache();
  let { identity } = useIdentityData();
  let canWrite = permission_token.permission_token_rights?.some((r) => r.write);
  let did = (canWrite && identity?.atp_did) || null;
  let facts = useEntity(did ? rootEntity : null, "root/collapsed-blocks");
  let mine = did ? facts.find((f) => f.author_did === did) : undefined;
  let serialized = JSON.stringify(mine?.data.value ?? []);

  let initial = props.initialFoldedBlocks;
  useIsomorphicLayoutEffect(() => {
    if (did || !initial || initial.length === 0) return;
    useUIState.setState({ foldedBlocks: [...initial] });
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!did) return;
    let value = JSON.parse(serialized) as string[];
    if (!sameSet(useUIState.getState().foldedBlocks, value))
      useUIState.setState({ foldedBlocks: value });
  }, [serialized, did, rootEntity]);

  return null;
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
