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
import { useLeafletFacts } from "./HomeLeafletFactsProvider";

const noFacts: never[] = [];

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
  previewFacts?: Fact<any>[];
  children: React.ReactNode;
}) {
  const [hasBeenVisible, setHasBeenVisible] = useState(props.eagerLoadFacts);
  const { facts: fetchedFacts } = useLeafletFacts(
    props.leaflet.root_entity,
    hasBeenVisible,
  );
  // The seed can come from a router-cached /home, so the fetch still runs.
  const facts = fetchedFacts ?? props.previewFacts;

  const notifyVisible = useCallback(() => {
    setHasBeenVisible((v) => v || true);
  }, []);
  const contextValue = useMemo(() => ({ notifyVisible }), [notifyVisible]);

  return (
    <CardVisibilityContext.Provider value={contextValue}>
      <ReplicacheProvider
        disablePull
        initialFactsOnly={props.loggedIn}
        rootEntity={props.leaflet.root_entity}
        token={props.leaflet}
        name={props.leaflet.root_entity}
        initialFacts={facts ?? noFacts}
      >
        {props.children}
      </ReplicacheProvider>
    </CardVisibilityContext.Provider>
  );
}
