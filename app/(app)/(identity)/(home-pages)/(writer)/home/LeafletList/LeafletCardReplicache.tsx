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
    hasBeenVisible && !props.previewFacts,
  );
  const facts = props.previewFacts ?? fetchedFacts;

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
