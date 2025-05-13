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
    <div className="w-full flex flex-col items-stretch">
      <div className="flex flex-row w-full justify-between border-b border-secondary text-secondary">
        <div>{props.name}</div>
        <div className="flex flex-row gap-2">
          {Object.keys(props.tabs).map((t) => (
            <Tab name={t} selected={t === tab} onSelect={() => setTab(t)} />
          ))}
        </div>
      </div>
      <div>{content}</div>
    </div>
  );
}

function Tab(props: { name: string; selected: boolean; onSelect: () => void }) {
  return (
    <div className="border" onClick={() => props.onSelect()}>
      {props.name}
    </div>
  );
}
