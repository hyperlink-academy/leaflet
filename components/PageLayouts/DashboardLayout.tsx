"use client";
import { useState, createContext, useContext } from "react";
import { Header } from "../PageHeader";
import { Footer } from "components/ActionBar/Footer";
import { Sidebar } from "components/ActionBar/Sidebar";
import {
  DesktopNavigation,
  MobileNavigation,
  navPages,
} from "components/ActionBar/Navigation";
import { create } from "zustand";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";
import { Separator } from "components/Layout";
import { CloseTiny } from "components/Icons/CloseTiny";
import { MediaContents } from "components/Media";
import { SortSmall } from "components/Icons/SortSmall";
import { TabsSmall } from "components/Icons/TabsSmall";

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
  getDashboard: (id: string) => DashboardState;
  setDashboard: (id: string, partial: Partial<DashboardState>) => void;
};

const defaultDashboardState: DashboardState = {
  display: undefined,
  sort: undefined,
  filter: { drafts: false, published: false, docs: false, templates: false },
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  dashboards: {},
  getDashboard: (id: string) => {
    const state = get();
    return state.dashboards[id] || defaultDashboardState;
  },
  setDashboard: (id: string, partial: Partial<DashboardState>) => {
    set((state) => ({
      dashboards: {
        ...state.dashboards,
        [id]: {
          ...state.getDashboard(id),
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
  const getDashboard = useDashboardStore((state) => state.getDashboard);
  return getDashboard(id);
};

export const useSetDashboardState = () => {
  const id = useDashboardId();
  const setDashboard = useDashboardStore((state) => state.setDashboard);
  return (partial: Partial<DashboardState>) => setDashboard(id, partial);
};

export function DashboardLayout<
  T extends {
    [name: string]: { content: React.ReactNode; controls: React.ReactNode };
  },
>(props: {
  id: string;
  hasBackgroundImage: boolean;
  defaultDisplay: Exclude<DashboardState["display"], undefined>;
  tabs: T;
  defaultTab: keyof T;
  currentPage: navPages;
  publication?: string;
  actions: React.ReactNode;
}) {
  let [tab, setTab] = useState(props.defaultTab);
  let { content, controls } = props.tabs[tab];

  let [state, setState] = useState<"default" | "controls">("default");

  return (
    <DashboardIdContext.Provider value={props.id}>
      <div className="home pwa-padding relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6 ">
        <MediaContents mobile={false}>
          <div className="flex flex-col gap-4 my-6">
            <Sidebar alwaysOpen>
              <DesktopNavigation
                currentPage={props.currentPage}
                publication={props.publication}
              />
              {props.actions}
            </Sidebar>
          </div>
        </MediaContents>
        <div
          className={`w-full h-full flex flex-col gap-2 relative overflow-y-scroll pt-3 pb-12 px-2 sm:pt-8 sm:pb-12 sm:pl-6 sm:pr-4 `}
          id="home-content"
        >
          <Header hasBackgroundImage={props.hasBackgroundImage}>
            {state === "default" ? (
              <>
                <div className="flex items-center gap-4">
                  {Object.keys(props.tabs).length > 1 && (
                    <div className="pubDashTabs flex flex-row gap-1">
                      {Object.keys(props.tabs).map((t) => (
                        <Tab
                          key={t}
                          name={t}
                          selected={t === tab}
                          onSelect={() => setTab(t)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {controls && (
                  <button
                    className={`sm:hidden block text-tertiary`}
                    onClick={() => {
                      setState("controls");
                    }}
                  >
                    <SortSmall />
                  </button>
                )}
                <div className={`sm:block hidden`}>{controls}</div>
              </>
            ) : (
              <>
                {controls}
                <button
                  className="text-tertiary"
                  onClick={() => {
                    setState("default");
                  }}
                >
                  <TabsSmall />
                </button>
              </>
            )}
          </Header>
          {content}
        </div>
        <Footer>
          <MobileNavigation
            currentPage={props.currentPage}
            publication={props.publication}
          />
          {props.actions}
        </Footer>
      </div>
    </DashboardIdContext.Provider>
  );
}

export const DashboardControls = (props: {
  showFilter: Boolean;

  defaultDisplay: Exclude<DashboardState["display"], undefined>;
}) => {
  let { display, sort } = useDashboardState();
  display = props.defaultDisplay;
  let setState = useSetDashboardState();
  return (
    <div className="flex gap-2 items-center text-sm text-tertiary">
      <button
        onClick={() =>
          setState({
            display: display === "list" ? "grid" : "list",
          })
        }
      >
        {display === "list" ? "Grid" : "List"}
      </button>
      <Separator classname="h-4" />
      {props.showFilter && (
        <>
          <FilterOptions /> <Separator classname="h-4" />
        </>
      )}

      <button
        onClick={() =>
          setState({
            sort: sort === "created" ? "alphabetical" : "created",
          })
        }
      >
        Sort: {sort === "created" ? "Created On" : "A to Z"}
      </button>
    </div>
  );
};

function Tab(props: { name: string; selected: boolean; onSelect: () => void }) {
  return (
    <div
      className={`pubTabs px-1 py-0 rounded-md hover:cursor-pointer ${props.selected ? "text-accent-2 bg-accent-1 font-bold -mb-[1px]" : "text-tertiary"}`}
      onClick={() => props.onSelect()}
    >
      {props.name}
    </div>
  );
}

const FilterOptions = () => {
  let { filter } = useDashboardState();
  let setState = useSetDashboardState();
  let filterCount = Object.values(filter).filter(Boolean).length;

  return (
    <Popover
      className="text-sm !px-2 !py-1"
      trigger={<div>Filter {filterCount > 0 && `(${filterCount})`}</div>}
    >
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
