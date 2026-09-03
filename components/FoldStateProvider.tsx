"use client";
import { createContext, useContext, useEffect } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { useUIState } from "src/useUIState";

// The editor route resolves identity only after mount, so its server render
// wouldn't know whose root/collapsed-blocks fact to read; the page resolves
// the session cookie to a DID server-side and passes it here, letting SSR,
// hydration, and the first paint all render the viewer's fold state from
// initialFacts.
const ServerDid = createContext<string | null>(null);

// The viewer's root/collapsed-blocks fact. `did` is null for signed-out and
// read-only viewers, whose fold state stays on the ephemeral store: their fact
// writes are dropped server-side and would revert on pull.
function useMyFoldFact() {
  let serverDid = useContext(ServerDid);
  let { identity } = useIdentityData();
  let { rootEntity, permission_token } = useReplicache();
  let canWrite = permission_token.permission_token_rights?.some((r) => r.write);
  let did = canWrite ? identity?.atp_did ?? serverDid : null;
  let facts = useEntity(did ? rootEntity : null, "root/collapsed-blocks");
  return {
    did,
    rootEntity,
    fact: did ? facts.find((f) => f.author_did === did) : undefined,
  };
}

const empty: string[] = [];
export function useFoldedBlocks(): readonly string[] {
  let { did, fact } = useMyFoldFact();
  let store = useUIState((s) => s.foldedBlocks);
  return did ? fact?.data.value ?? empty : store;
}

export function useIsFolded(entityID: string) {
  return useFoldedBlocks().includes(entityID);
}

export function FoldStateProvider(props: {
  serverDid?: string | null;
  children: React.ReactNode;
}) {
  return (
    <ServerDid.Provider value={props.serverDid ?? null}>
      <FoldMirrorSync />
      {props.children}
    </ServerDid.Provider>
  );
}

// Event-time code (keymaps, selection, move and list operations) reads
// foldedBlocks synchronously from the zustand store; keep it mirroring the
// signed-in user's fact.
function FoldMirrorSync() {
  let { did, rootEntity, fact } = useMyFoldFact();
  let serialized = JSON.stringify(fact?.data.value ?? []);
  useEffect(() => {
    if (!did) return;
    let value = JSON.parse(serialized) as string[];
    let current = useUIState.getState().foldedBlocks;
    if (
      value.length !== current.length ||
      !value.every((v) => current.includes(v))
    )
      useUIState.setState({ foldedBlocks: value });
  }, [serialized, did, rootEntity]);
  return null;
}
