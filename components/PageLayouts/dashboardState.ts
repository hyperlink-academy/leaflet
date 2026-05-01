"use client";
import { createContext, useContext } from "react";
import { create } from "zustand";
import { InterfaceState, useIdentityData } from "components/IdentityProvider";
import { updateIdentityInterfaceState } from "actions/updateIdentityInterfaceState";

export type DashboardState = {
  display?: "grid" | "list";
  sort?: "created" | "alphabetical";
  filter: {
    drafts: boolean;
    published: boolean;
    docs: boolean;
    archived: boolean;
  };
};

type DashboardStore = {
  dashboards: { [id: string]: DashboardState };
  setDashboard: (id: string, partial: Partial<DashboardState>) => void;
};

const defaultDashboardState: DashboardState = {
  display: undefined,
  sort: undefined,
  filter: {
    drafts: false,
    published: false,
    docs: false,
    archived: false,
  },
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  dashboards: {},
  setDashboard: (id: string, partial: Partial<DashboardState>) => {
    set((state) => ({
      dashboards: {
        ...state.dashboards,
        [id]: {
          ...(state.dashboards[id] || defaultDashboardState),
          ...partial,
        },
      },
    }));
  },
}));

export const DashboardIdContext = createContext<string | null>(null);

export const useDashboardId = () => {
  const id = useContext(DashboardIdContext);
  if (!id) {
    throw new Error("useDashboardId must be used within a DashboardLayout");
  }
  return id;
};

export const useDashboardState = () => {
  const id = useDashboardId();
  let { identity } = useIdentityData();
  let localState = useDashboardStore(
    (state) => state.dashboards[id] || defaultDashboardState,
  );
  if (!identity) return localState;
  let metadata = identity.interface_state as InterfaceState;
  return metadata?.dashboards?.[id] || defaultDashboardState;
};

export const useSetDashboardState = () => {
  const id = useDashboardId();
  let { identity, mutate } = useIdentityData();
  const setDashboard = useDashboardStore((state) => state.setDashboard);
  return async (partial: Partial<DashboardState>) => {
    if (!identity) return setDashboard(id, partial);

    let interface_state = (identity.interface_state as InterfaceState) || {};
    let newDashboardState = {
      ...defaultDashboardState,
      ...interface_state.dashboards?.[id],
      ...partial,
    };
    mutate(
      {
        ...identity,
        interface_state: {
          ...interface_state,
          dashboards: {
            ...interface_state.dashboards,
            [id]: newDashboardState,
          },
        },
      },
      { revalidate: false },
    );
    await updateIdentityInterfaceState({
      ...interface_state,
      dashboards: {
        [id]: newDashboardState,
      },
    });
  };
};
