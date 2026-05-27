"use client";
import { createContext, useContext, useMemo, useState } from "react";

type DirtyState = "unknown" | "clean" | "dirty";

type DirtyContextValue = {
  state: DirtyState;
  setState: (state: DirtyState) => void;
};

const PublicationEditDirtyContext = createContext<DirtyContextValue>({
  state: "unknown",
  setState: () => {},
});

export function PublicationEditDirtyProvider(props: {
  children: React.ReactNode;
}) {
  let [state, setState] = useState<DirtyState>("unknown");
  let value = useMemo(() => ({ state, setState }), [state]);
  return (
    <PublicationEditDirtyContext.Provider value={value}>
      {props.children}
    </PublicationEditDirtyContext.Provider>
  );
}

export function usePublicationEditDirtyState() {
  return useContext(PublicationEditDirtyContext).state;
}

export function useSetPublicationEditDirtyState() {
  return useContext(PublicationEditDirtyContext).setState;
}
