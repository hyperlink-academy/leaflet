"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  ReplicacheProvider,
  type Fact,
  type PermissionToken,
} from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { useLeafletFacts } from "./HomeLeafletFactsProvider";

// Cards assumed on-screen before the IntersectionObserver has fired: they
// fetch their facts on mount, so the initial view resolves in a single batched
// getFactsForRoots call.
export const EAGERLY_VISIBLE_CARDS = 16;

const NO_FACTS: Fact<Attribute>[] = [];

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
  const facts = useLeafletFacts(props.leaflet.root_entity, hasBeenVisible);

  const notifyVisible = useCallback(() => setHasBeenVisible(true), []);
  const contextValue = useMemo(() => ({ notifyVisible }), [notifyVisible]);

  // The provider must mount exactly once per card: the facts reach readers
  // through its context value, not through a remount.
  return (
    <CardVisibilityContext.Provider value={contextValue}>
      <ReplicacheProvider
        disablePull
        initialFactsOnly={props.loggedIn}
        rootEntity={props.leaflet.root_entity}
        token={props.leaflet}
        name={props.leaflet.root_entity}
        initialFacts={facts ?? NO_FACTS}
      >
        {props.children}
      </ReplicacheProvider>
    </CardVisibilityContext.Provider>
  );
}
