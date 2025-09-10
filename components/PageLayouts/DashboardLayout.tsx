"use client";
import { useState } from "react";
import { Header } from "../PageHeader";
import { Footer } from "components/ActionBar/Footer";
import { Sidebar } from "components/ActionBar/Sidebar";
import { Navigation, navPages } from "components/ActionBar/Navigation";
import { PubLeafletPublication } from "lexicons/api";

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
        className={`w-full h-full flex flex-col gap-2 relative overflow-y-scroll pt-3 pb-12 px-2 sm:pt-8 sm:pb-12 sm:pl-6 sm:pr-4 `}
        id="home-content"
      >
        <Header hasBackgroundImage={props.hasBackgroundImage}>
          <div className="flex items-center gap-4">
            {/*{props.title}*/}
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
          <div className="flex gap-2 text-sm text-tertiary">
            <div>Grid</div>
            <div>Filter</div>
            <div>Sort</div>
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
