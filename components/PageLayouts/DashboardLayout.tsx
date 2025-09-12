"use client";
import { useState } from "react";
import { Header } from "../PageHeader";
import { Footer } from "components/ActionBar/Footer";
import { Sidebar } from "components/ActionBar/Sidebar";
import { Navigation, navPages } from "components/ActionBar/Navigation";
import { PubLeafletPublication } from "lexicons/api";
import { create } from "zustand";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";
import { Separator } from "components/Layout";
import { CloseEvent } from "node:http";
import { CloseTiny } from "components/Icons/CloseTiny";

export const useDashboardState = create(() => ({
  display: "grid" as "grid" | "list",
  sort: "created" as "created" | "alphabetical",
  filter: { drafts: false, published: false, docs: false },
}));

export function DashboardLayout<
  T extends { [name: string]: React.ReactNode },
>(props: {
  hasBackgroundImage: boolean;
  tabs: T;
  defaultTab: keyof T;
  currentPage: navPages;
  publication?: string;
  actions: React.ReactNode;
}) {
  let [tab, setTab] = useState(props.defaultTab);
  let content = props.tabs[tab];

  let display = useDashboardState((state) => state.display);
  let sort = useDashboardState((state) => state.sort);

  return (
    <div className="home pwa-padding relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6 ">
      <div className="flex flex-col gap-4 my-6">
        <Navigation
          currentPage={props.currentPage}
          publication={props.publication}
        />
        <Sidebar alwaysOpen>{props.actions}</Sidebar>
      </div>
      <div
        className={`w-full  flex flex-col gap-2 relative overflow-y-scroll pt-3 pb-12 px-2 sm:pt-8 sm:pb-12 sm:pl-6 sm:pr-4 `}
        id="home-content"
      >
        <Header hasBackgroundImage={props.hasBackgroundImage}>
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
          <div className="flex gap-2 items-center text-sm text-tertiary">
            <button
              onClick={() =>
                useDashboardState.setState({
                  display: display === "list" ? "grid" : "list",
                })
              }
            >
              {display === "list" ? "Grid" : "List"}
            </button>
            <Separator classname="h-4" />
            <FilterOptions />
            <Separator classname="h-4" />

            <button
              onClick={() =>
                useDashboardState.setState({
                  sort: sort === "created" ? "alphabetical" : "created",
                })
              }
            >
              Sort: {sort === "created" ? "Created On" : "A to Z"}
            </button>
          </div>
        </Header>
        {content}
      </div>
      <Footer>{props.actions}</Footer>
    </div>
  );
}

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
  let filter = useDashboardState((state) => state.filter);
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
          useDashboardState.setState({
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
          useDashboardState.setState({
            filter: { ...filter, published: !!e.target.checked },
          })
        }
      >
        Published
      </Checkbox>
      <Checkbox
        small
        checked={filter.docs}
        onChange={(e) =>
          useDashboardState.setState({
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
          useDashboardState.setState({
            filter: { docs: false, published: false, drafts: false },
          });
        }}
      >
        <CloseTiny className="scale-75" /> Clear
      </button>
    </Popover>
  );
};
