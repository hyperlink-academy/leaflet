"use client";
import { useState, createContext, useContext, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "../PageHeader";
import { Footer } from "components/ActionBar/Footer";
import { Sidebar } from "components/ActionBar/Sidebar";
import {
  DesktopNavigation,
  MobileNavigation,
  navPages,
  NotificationButton,
} from "components/ActionBar/Navigation";
import { create } from "zustand";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";
import { Separator } from "components/Layout";
import { CloseTiny } from "components/Icons/CloseTiny";
import { MediaContents } from "components/Media";
import { SortSmall } from "components/Icons/SortSmall";
import { TabsSmall } from "components/Icons/TabsSmall";
import { Input } from "components/Input";
import { SearchTiny } from "components/Icons/SearchTiny";
import { InterfaceState, useIdentityData } from "components/IdentityProvider";
import { updateIdentityInterfaceState } from "actions/updateIdentityInterfaceState";
import Link from "next/link";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";

export type DashboardState = {
  display?: "grid" | "list";
  sort?: "created" | "alphabetical";
  filter: {
    drafts: boolean;
    published: boolean;
    docs: boolean;
    templates: boolean;
  };
};

type DashboardStore = {
  dashboards: { [id: string]: DashboardState };
  setDashboard: (id: string, partial: Partial<DashboardState>) => void;
};

const defaultDashboardState: DashboardState = {
  display: undefined,
  sort: undefined,
  filter: { drafts: false, published: false, docs: false, templates: false },
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  dashboards: {},
  setDashboard: (id: string, partial: Partial<DashboardState>) => {
    console.log(partial);
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

const DashboardIdContext = createContext<string | null>(null);

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
      controls: React.ReactNode;
    };
  },
>(props: {
  id: string;
  cardBorderHidden: boolean;
  tabs: T;
  defaultTab: keyof T;
  currentPage: navPages;
  publication?: string;
  actions: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Initialize tab from search param if valid, otherwise use default
  const initialTab =
    tabParam && props.tabs[tabParam] ? tabParam : props.defaultTab;
  let [tab, setTab] = useState<keyof T>(initialTab);

  // Custom setter that updates both state and URL
  const setTabWithUrl = (newTab: keyof T) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab as string);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  };

  let { content, controls } = props.tabs[tab];
  let { ref } = usePreserveScroll<HTMLDivElement>(
    `dashboard-${props.id}-${tab as string}`,
  );

  let [headerState, setHeaderState] = useState<"default" | "controls">(
    "default",
  );
  return (
    <DashboardIdContext.Provider value={props.id}>
      <div
        className={`dashboard pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6`}
      >
        <MediaContents mobile={false}>
          <div className="flex flex-col gap-4 my-6">
            <DesktopNavigation
              currentPage={props.currentPage}
              publication={props.publication}
            />
            {props.actions && <Sidebar alwaysOpen>{props.actions}</Sidebar>}
          </div>
        </MediaContents>
        <div
          className={`w-full h-full flex flex-col gap-2 relative overflow-y-scroll pt-3 pb-12 px-3 sm:pt-8 sm:pb-12 sm:pl-6 sm:pr-4 `}
          ref={ref}
          id="home-content"
        >
          {Object.keys(props.tabs).length <= 1 && !controls ? null : (
            <>
              <Header cardBorderHidden={props.cardBorderHidden}>
                {headerState === "default" ? (
                  <>
                    {Object.keys(props.tabs).length > 1 && (
                      <div className="pubDashTabs flex flex-row gap-1">
                        {Object.keys(props.tabs).map((t) => {
                          return (
                            <Tab
                              key={t}
                              name={t}
                              selected={t === tab}
                              onSelect={() => setTabWithUrl(t)}
                            />
                          );
                        })}
                      </div>
                    )}
                    {props.publication && (
                      <button
                        className={`sm:hidden block text-tertiary`}
                        onClick={() => {
                          setHeaderState("controls");
                        }}
                      >
                        <SortSmall />
                      </button>
                    )}
                    <div
                      className={`sm:block ${props.publication && "hidden"} grow`}
                    >
                      {controls}
                    </div>
                  </>
                ) : (
                  <>
                    {controls}
                    <button
                      className="text-tertiary"
                      onClick={() => {
                        setHeaderState("default");
                      }}
                    >
                      <TabsSmall />
                    </button>
                  </>
                )}
              </Header>
            </>
          )}
          {content}
        </div>
        <Footer>
          <MobileNavigation
            currentPage={props.currentPage}
            publication={props.publication}
          />
          {props.actions && (
            <>
              <Separator />
              {props.actions}
            </>
          )}
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
  hasTemplates: boolean;
}) => {
  let { display, sort } = useDashboardState();
  console.log({ display, props });
  display = display || props.defaultDisplay;
  let setState = useSetDashboardState();

  let { identity } = useIdentityData();
  console.log(props);

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

        {props.hasPubs || props.hasTemplates ? (
          <>
            {props.hasPubs}
            {props.hasTemplates}
            <FilterOptions
              hasPubs={props.hasPubs}
              hasTemplates={props.hasTemplates}
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
  console.log({ display, props });
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

function Tab(props: {
  name: string;
  selected: boolean;
  onSelect: () => void;
  href?: string;
}) {
  return (
    <div
      className={`pubTabs px-1 py-0 flex gap-1 items-center rounded-md hover:cursor-pointer ${props.selected ? "text-accent-2 bg-accent-1 font-bold -mb-px" : "text-tertiary"}`}
      onClick={() => props.onSelect()}
    >
      {props.name}
      {props.href && <ExternalLinkTiny />}
    </div>
  );
}

const FilterOptions = (props: { hasPubs: boolean; hasTemplates: boolean }) => {
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

      {props.hasTemplates && (
        <>
          <Checkbox
            small
            checked={filter.templates}
            onChange={(e) =>
              setState({
                filter: { ...filter, templates: !!e.target.checked },
              })
            }
          >
            Templates
          </Checkbox>
        </>
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
              templates: false,
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
          border rounded-md border-transparent focus-within:border-border
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
