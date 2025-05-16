"use client";
import { useState } from "react";

type Tabs = { [tabName: string]: React.ReactNode };
export function PublicationDashboard<T extends Tabs>(props: {
  name: string;
  tabs: T;
  defaultTab: keyof T;
}) {
  let [tab, setTab] = useState(props.defaultTab);
  let content = props.tabs[tab];
  return (
    <div className="pubDashWrapper w-full flex flex-col items-stretch px-3">
      <div className="pubDashTabWrapper flex flex-row w-full justify-between border-b border-border text-secondary items-center">
        <div className="font-bold text-tertiary">{props.name}</div>
        <div className="pubDashTabs flex flex-row gap-2">
          {Object.keys(props.tabs).map((t) => (
            <Tab
              key={t}
              name={t}
              selected={t === tab}
              onSelect={() => setTab(t)}
            />
          ))}
        </div>
      </div>
      <div className="pubDashContent pt-4">{content}</div>
    </div>
  );
}

function Tab(props: { name: string; selected: boolean; onSelect: () => void }) {
  return (
    <div
      className={`pubTabs border bg-[#FDFCFA]  border-b-0 px-2 pt-1 pb-0.5 rounded-t-md border-border hover:cursor-pointer ${props.selected ? "text-accent-1 font-bold -mb-[1px]" : ""}`}
      onClick={() => props.onSelect()}
    >
      {props.name}
    </div>
  );
}
