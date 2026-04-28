"use client";
import { useState, createContext, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { Footer } from "components/ActionBar/Footer";
import { MobileNavigation } from "components/ActionBar/MobileNavigation";
import { navPages } from "components/ActionBar/NavigationButtons";
import { DesktopNavigation } from "components/ActionBar/DesktopNavigation";
import { create } from "zustand";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";
import { Separator } from "components/Layout";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Input } from "components/Input";
import { SearchTiny } from "components/Icons/SearchTiny";
import { InterfaceState, useIdentityData } from "components/IdentityProvider";
import { updateIdentityInterfaceState } from "actions/updateIdentityInterfaceState";
export { PageTitle } from "./DashboardPageLayout";

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
        <Footer>
          <MobileNavigation
            pubName={props.pubName}
            currentPage={props.currentPage}
            tabs={props.tabs}
            currentTab={tab as string}
            onTabClick={(t) => setTabWithUrl(t as keyof T)}
            onTabHover={props.onTabHover}
          />
        </Footer>
      </div>
    </DashboardIdContext.Provider>
  );
}

export const HomeDashboardControls = (props: {
  searchValue: string;
  setSearchValueAction: (searchValue: string) => void;
  hasBackgroundImage: boolean;
  defaultDisplay: Exclude<DashboardState["display"], undefined>;
  hasPubs: boolean;
  hasArchived: boolean;
}) => {
  let { display, sort } = useDashboardState();
  display = display || props.defaultDisplay;
  let setState = useSetDashboardState();

  let { identity } = useIdentityData();

  return (
    <div className="dashboardControls w-full flex gap-4">
      {identity && (
        <SearchInput
          searchValue={props.searchValue}
          setSearchValue={props.setSearchValueAction}
          hasBackgroundImage={props.hasBackgroundImage}
        />
      )}
      <div className="flex gap-2 w-max shrink-0 items-center text-sm text-tertiary">
        <DisplayToggle setState={setState} display={display} />
        <Separator classname="h-4 min-h-4!" />

        {props.hasPubs || props.hasArchived ? (
          <>
            <FilterOptions
              hasPubs={props.hasPubs}
              hasArchived={props.hasArchived}
            />
            <Separator classname="h-4 min-h-4!" />{" "}
          </>
        ) : null}
        <SortToggle setState={setState} sort={sort} />
      </div>
    </div>
  );
};

export const PublicationDashboardControls = (props: {
  searchValue: string;
  setSearchValueAction: (searchValue: string) => void;
  hasBackgroundImage: boolean;
  defaultDisplay: Exclude<DashboardState["display"], undefined>;
}) => {
  let { display, sort } = useDashboardState();
  display = display || props.defaultDisplay;
  let setState = useSetDashboardState();
  return (
    <div className="dashboardControls w-full flex gap-4">
      <SearchInput
        searchValue={props.searchValue}
        setSearchValue={props.setSearchValueAction}
        hasBackgroundImage={props.hasBackgroundImage}
      />
      <div className="flex gap-2 w-max shrink-0 items-center text-sm text-tertiary">
        <DisplayToggle setState={setState} display={display} />
        <Separator classname="h-4 min-h-4!" />
        <SortToggle setState={setState} sort={sort} />
      </div>
    </div>
  );
};

const SortToggle = (props: {
  setState: (partial: Partial<DashboardState>) => Promise<void>;
  sort: string | undefined;
}) => {
  return (
    <button
      onClick={() =>
        props.setState({
          sort: props.sort === "created" ? "alphabetical" : "created",
        })
      }
    >
      Sort: {props.sort === "created" ? "Created On" : "A to Z"}
    </button>
  );
};

const DisplayToggle = (props: {
  setState: (partial: Partial<DashboardState>) => Promise<void>;
  display: string | undefined;
}) => {
  return (
    <button
      onClick={() => {
        props.setState({
          display: props.display === "list" ? "grid" : "list",
        });
      }}
    >
      {props.display === "list" ? "List" : "Grid"}
    </button>
  );
};

const FilterOptions = (props: { hasPubs: boolean; hasArchived: boolean }) => {
  let { filter } = useDashboardState();
  let setState = useSetDashboardState();
  let filterCount = Object.values(filter).filter(Boolean).length;

  return (
    <Popover
      className="text-sm px-2! py-1!"
      trigger={<div>Filter {filterCount > 0 && `(${filterCount})`}</div>}
    >
      {props.hasPubs && (
        <>
          <Checkbox
            small
            checked={filter.drafts}
            onChange={(e) =>
              setState({
                filter: { ...filter, drafts: !!e.target.checked },
              })
            }
          >
            Drafts
          </Checkbox>
          <Checkbox
            small
            checked={filter.published}
            onChange={(e) =>
              setState({
                filter: { ...filter, published: !!e.target.checked },
              })
            }
          >
            Published
          </Checkbox>
        </>
      )}

      {props.hasArchived && (
        <Checkbox
          small
          checked={filter.archived}
          onChange={(e) =>
            setState({
              filter: { ...filter, archived: !!e.target.checked },
            })
          }
        >
          Archived
        </Checkbox>
      )}
      <Checkbox
        small
        checked={filter.docs}
        onChange={(e) =>
          setState({
            filter: { ...filter, docs: !!e.target.checked },
          })
        }
      >
        Docs
      </Checkbox>
      <hr className="border-border-light mt-1 mb-0.5" />
      <button
        className="flex gap-1 items-center -mx-[2px] text-tertiary"
        onClick={() => {
          setState({
            filter: {
              docs: false,
              published: false,
              drafts: false,
              archived: false,
            },
          });
        }}
      >
        <CloseTiny className="scale-75" /> Clear
      </button>
    </Popover>
  );
};

const SearchInput = (props: {
  searchValue: string;
  setSearchValue: (searchValue: string) => void;
  hasBackgroundImage: boolean;
}) => {
  return (
    <div className="relative grow shrink-0">
      <Input
        className={`dashboardSearchInput
          appearance-none! outline-hidden!
          w-full min-w-0 text-primary relative pl-7  pr-1 -my-px
          border rounded-md border-border-light focus-within:border-border
          bg-transparent ${props.hasBackgroundImage ? "focus-within:bg-bg-page" : "focus-within:bg-bg-leaflet"} `}
        type="text"
        id="pubName"
        size={1}
        placeholder="search..."
        value={props.searchValue}
        onChange={(e) => {
          props.setSearchValue(e.currentTarget.value);
        }}
      />
      <div className="absolute left-[6px] top-[4px] text-tertiary">
        <SearchTiny />
      </div>
    </div>
  );
};
