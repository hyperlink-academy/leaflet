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

function useFoldDid() {
  let serverDid = useContext(ServerDid);
  let { identity } = useIdentityData();
  let { permission_token } = useReplicache();
  // Read-only viewers stay on the ephemeral store: their fact writes are
  // dropped server-side and would revert on pull.
  let canWrite = permission_token.permission_token_rights?.some((r) => r.write);
  if (!canWrite) return null;
  return identity?.atp_did ?? serverDid;
}

const empty: string[] = [];
export function useFoldedBlocks(): readonly string[] {
  let did = useFoldDid();
  let { rootEntity } = useReplicache();
  let facts = useEntity(did ? rootEntity : null, "root/collapsed-blocks");
  let store = useUIState((s) => s.foldedBlocks);
  if (!did) return store;
  return facts.find((f) => f.author_did === did)?.data.value ?? empty;
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
  let did = useFoldDid();
  let { rootEntity } = useReplicache();
  let facts = useEntity(did ? rootEntity : null, "root/collapsed-blocks");
  let mine = did ? facts.find((f) => f.author_did === did) : undefined;
  let serialized = JSON.stringify(mine?.data.value ?? []);
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
