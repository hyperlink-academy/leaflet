"use client";
import { useState } from "react";

export function PublicationDashboard(props: { name: string }) {
  let [tab, setTab] = useState("");
  return (
    <div className="w-full flex flex-col items-stretch">
      <div className="flex flex-row w-full justify-between border-b border-secondary text-secondary">
        <div>{props.name}</div>
        <div className="flex flex-row gap-2">
          <Tab name="Drafts" />
          <Tab name="Published" />
        </div>
      </div>
      <div></div>
    </div>
  );
}

function Tab(props: { name: string }) {
  return <div className="border">{props.name}</div>;
}
