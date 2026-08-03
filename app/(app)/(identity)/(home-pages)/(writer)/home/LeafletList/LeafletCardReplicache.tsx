"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ReplicacheProvider, type PermissionToken } from "src/replicache";
import { useLeafletFacts } from "./HomeLeafletFactsProvider";

// Cards assumed on-screen before the IntersectionObserver has fired: they
// render their preview and fetch facts immediately on mount. One constant for
// both so the initial view resolves in a single batched getFactsForRoots call —
// a card that renders eagerly but fetches lazily lands in a second RPC batch.
export const EAGERLY_VISIBLE_CARDS = 16;

const CardVisibilityContext = createContext<{
  notifyVisible: () => void;
} | null>(null);

export function useReportCardVisible() {
  return useContext(CardVisibilityContext);
}

export function LeafletCardReplicache(props: {
  leaflet: PermissionToken;
  loggedIn: boolean;
  eagerLoadFacts: boolean;
  children: React.ReactNode;
}) {
  const [hasBeenVisible, setHasBeenVisible] = useState(props.eagerLoadFacts);
  const { facts } = useLeafletFacts(
    props.leaflet.root_entity,
    hasBeenVisible,
  );

  const notifyVisible = useCallback(() => {
    setHasBeenVisible((v) => v || true);
  }, []);
  const contextValue = useMemo(() => ({ notifyVisible }), [notifyVisible]);

  const initialFacts = facts ?? [];
  const providerKey = `${props.leaflet.id}:${facts ? "loaded" : "loading"}`;

  return (
    <CardVisibilityContext.Provider value={contextValue}>
      <ReplicacheProvider
        disablePull
        initialFactsOnly={props.loggedIn}
        key={providerKey}
        rootEntity={props.leaflet.root_entity}
        token={props.leaflet}
        name={props.leaflet.root_entity}
        initialFacts={initialFacts}
      >
        {props.children}
      </ReplicacheProvider>
    </CardVisibilityContext.Provider>
  );
}
