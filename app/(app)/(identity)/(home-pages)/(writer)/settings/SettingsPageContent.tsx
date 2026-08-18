"use client";

import { useSearchParams } from "next/navigation";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { SettingsPageLayout, SettingsSection } from "components/SettingsLayout";
import { Tabs, useTabParam } from "components/Tabs";
import { ProTab } from "./ProTab";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrow } from "components/Icons/GoToArrow";
import { useIdentityData } from "components/IdentityProvider";
import { useIsPro, useCanSeePayments } from "src/hooks/useEntitlement";
import { BillingTab } from "./BillingTab";
import type { MyMembershipsData } from "actions/memberships";
import { DomainTab } from "./domains/DomainTab";
import { MonetizationTab } from "./MonetizationTab";

export type MonetizationPub = {
  uri: string;
  name: string | null;
  settingsHref: string;
  monetizationEnabled: boolean;
};

type SettingsTab = "domains" | "billing" | "monetization" | "pro";

export function SettingsPageContent(props: {
  memberships: MyMembershipsData | null;
  monetizationPubs: MonetizationPub[];
}) {
  let canSeePayments = useCanSeePayments();
  let searchParams = useSearchParams();

  let tabs: { value: SettingsTab; label: string }[] = [
    { value: "domains", label: "Domains" },
    { value: "billing", label: "Billing" },
    ...(canSeePayments
      ? [{ value: "monetization" as const, label: "Monetization" }]
      : []),
    { value: "pro", label: "Leaflet Pro" },
  ];

  let [tab, chooseTab] = useTabParam<SettingsTab>(
    tabs,
    // Returning from the hosted card-update page lands on /settings with only
    // a wallet_session param; the billing tab owns processing it.
    searchParams.get("wallet_session") ? "billing" : "domains",
  );

  let onTabChange = (value: SettingsTab) => {
    chooseTab(value);
    window.history.replaceState(null, "", `/settings?tab=${value}`);
  };

  let tabBar = <Tabs value={tab} onChange={onTabChange} options={tabs} pill />;

  return (
    <DashboardPageLayout
      scrollKey="settings"
      pageTitle="Settings"
      showHeader
      controls={tabBar}
    >
      {/* The header (and the tab bar in it) only renders on desktop. */}
      <div className="sm:hidden pb-2">{tabBar}</div>
      <SettingsPageLayout>
        {tab === "domains" && <DomainTab />}
        {tab === "billing" && (
          <BillingTab
            initial={props.memberships ?? { memberships: [], wallet: null }}
          />
        )}
        {tab === "monetization" && (
          <MonetizationTab pubs={props.monetizationPubs} />
        )}
        {tab === "pro" && <ProTab />}
      </SettingsPageLayout>
    </DashboardPageLayout>
  );
}
