"use client";
import { useEffect, useState } from "react";
import { v7 } from "uuid";
import { useEntity, useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { registerFoldMutator, useUIState } from "src/useUIState";

export function CollapsedBlocksSync() {
  let { rep, rootEntity, permission_token } = useReplicache();
  let { identity } = useIdentityData();
  let canWrite = permission_token.permission_token_rights?.some((r) => r.write);
  let did = (canWrite && identity?.atp_did) || null;
  let facts = useEntity(did ? rootEntity : null, "root/collapsed-blocks");
  let mine = did ? facts.find((f) => f.author_did === did) : undefined;
  let serialized = JSON.stringify(mine?.data.value ?? []);

  let [factID] = useState(() => v7());

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
