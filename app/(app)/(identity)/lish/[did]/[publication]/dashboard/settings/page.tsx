"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { Tabs } from "components/Tabs";
import {
  SettingsContent,
  usePubSettingsTabs,
  type PubSettingsTab,
} from "./SettingsContent";
import { NewDraftActionButton } from "../NewDraftButton";
import { usePublicationData } from "../PublicationSWRProvider";

export default function SettingsPage() {
  let { data } = usePublicationData();
  let pubUri = data?.publication?.uri || "";
  let pathname = usePathname();
  let tabs = usePubSettingsTabs();

  let requestedTab = useSearchParams().get("tab");
  // The tab list comes from identity/publication data that resolves after the
  // first render, so a ?tab= link can't be validated there — keep resolving it
  // until the reader picks a tab themselves.
  let [chosenTab, setChosenTab] = useState<PubSettingsTab | null>(null);
  let tab =
    chosenTab ??
    (tabs.some((t) => t.value === requestedTab)
      ? (requestedTab as PubSettingsTab)
      : "general");

  let onTabChange = (value: PubSettingsTab) => {
    setChosenTab(value);
    window.history.replaceState(
      null,
      "",
      value === "general" ? pathname : `${pathname}?tab=${value}`,
    );
  };

  let tabBar =
    tabs.length > 1 ? (
      <Tabs value={tab} onChange={onTabChange} options={tabs} pill />
    ) : null;

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${pubUri}-Settings`}
      pageTitle="Settings"
      mobileActions={<NewDraftActionButton publication={pubUri} compact />}
      publication={pubUri}
      showHeader={!!tabBar}
      controls={tabBar}
    >
      {/* The header (and the tab bar in it) only renders on desktop. */}
      {tabBar && <div className="sm:hidden pb-2">{tabBar}</div>}
      <SettingsContent tab={tab} />
    </DashboardPageLayout>
  );
}
