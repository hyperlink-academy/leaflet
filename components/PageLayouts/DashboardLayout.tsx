"use client";
import { useState } from "react";
import { Header } from "../PageHeader";
import { Footer } from "components/ActionBar/Footer";
import { Sidebar } from "components/ActionBar/Sidebar";
import { Navigation } from "components/ActionBar/Navigation";

export function DashboardLayout<
  T extends { [name: string]: React.ReactNode },
>(props: {
  tabs: T;
  defaultTab: keyof T;
  actions: React.ReactNode;
  title: React.ReactNode;
}) {
  let [tab, setTab] = useState(props.defaultTab);
  let content = props.tabs[tab];
  return (
    <div className="home pwa-padding relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6 ">
      <div className="flex flex-col gap-4 my-6">
        <Navigation />
        <Sidebar alwaysOpen className="!w-full">
          {props.actions}
        </Sidebar>
      </div>
      <div
        className={`w-full h-full flex flex-col gap-3 relative overflow-y-scroll pt-3 pb-12 px-2 sm:pt-7 sm:pb-12 sm:pl-6 sm:pr-4 `}
        id="home-content"
      >
        <Header>
          {props.title}
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
      className={`pubTabs border  border-b-0 px-2 pt-1 pb-0.5 rounded-t-md border-border hover:cursor-pointer ${props.selected ? "text-accent-contrast font-bold -mb-[1px]" : ""}`}
      onClick={() => props.onSelect()}
    >
      {props.name}
    </div>
  );
}
