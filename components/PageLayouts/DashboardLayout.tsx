"use client";
import { useState, createContext, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { navPages } from "components/ActionBar/NavigationButtons";
import { DesktopNavigation } from "components/ActionBar/DesktopNavigation";
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

export const useDashboardStore = create<DashboardStore>((set, get) => ({
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

export function DashboardLayout<
  T extends {
    [name: string]: {
      content: React.ReactNode;
      icon?: React.ReactNode;
    };
  },
>(props: {
  id: string;
  tabs: T;
  defaultTab: keyof T;
  currentPage: navPages;
  publication?: string;
  pubName?: string;
  profileDid?: string;
  actions?: React.ReactNode;
  onTabHover?: (tabName: string) => void;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const initialTab =
    tabParam && props.tabs[tabParam] ? tabParam : props.defaultTab;
  let [tab, setTab] = useState<keyof T>(initialTab);

  const setTabWithUrl = (newTab: keyof T) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab as string);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  };

  let { content } = props.tabs[tab];

  return (
    <DashboardIdContext.Provider value={props.id}>
      <div
        className={`dashboard pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6`}
      >
        <DesktopNavigation
          currentPage={props.currentPage}
          publication={props.publication}
          actions={props.actions}
          tabs={props.tabs}
          currentTab={tab as string}
          onTabClick={(t) => setTabWithUrl(t as keyof T)}
          onTabHover={props.onTabHover}
        />
        {content}
      </div>
    </DashboardIdContext.Provider>
  );
}

