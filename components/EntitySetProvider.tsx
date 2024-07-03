"use client";
import { createContext, useContext } from "react";
import { useReplicache } from "src/replicache";

export const EntitySetContext = createContext({
  set: "",
  permissions: { read: false, write: false },
});
export const useEntitySetContext = () => useContext(EntitySetContext);

export function EntitySetProvider(props: {
  set: string;
  children: React.ReactNode;
}) {
  let { permission_token } = useReplicache();
  return (
    <EntitySetContext.Provider
      value={{
        set: props.set,
        permissions: permission_token.permission_token_rights.find(
          (r) => r.entity_set === props.set,
        ) || { read: false, write: false },
      }}
    >
      {props.children}
    </EntitySetContext.Provider>
  );
}
