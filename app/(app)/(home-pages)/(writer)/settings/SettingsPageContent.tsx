"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { SettingsPageLayout, SettingsSection } from "components/SettingsLayout";
import { Tabs } from "components/Tabs";
import { ManageDomainsContent } from "components/Domains/ManageDomains";
import { ConnectPayments } from "components/StripeConnect/ConnectPayments";
import { ManageProSubscription } from "./ManageProSubscription";
import { UpgradeToProButton } from "app/(app)/lish/[did]/[publication]/UpgradeModal";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrow } from "components/Icons/GoToArrow";
import { useIdentityData } from "components/IdentityProvider";
import { useIsPro, useCanSeePayments } from "src/hooks/useEntitlement";
import { MembershipsManager } from "./MembershipsManager";
import type { MyMembershipsData } from "actions/memberships";

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

  let requestedTab = searchParams.get("tab");
  let [tab, setTab] = useState<SettingsTab>(
    tabs.some((t) => t.value === requestedTab)
      ? (requestedTab as SettingsTab)
      : // Returning from the hosted card-update page lands on /settings with
        // only a wallet_session param; the billing tab owns processing it.
        searchParams.get("wallet_session")
        ? "billing"
        : "domains",
  );

  let onTabChange = (value: SettingsTab) => {
    setTab(value);
    window.history.replaceState(null, "", `/settings?tab=${value}`);
  };

  let tabBar = <Tabs value={tab} onChange={onTabChange} options={tabs} />;

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
        {tab === "domains" && (
          <SettingsSection>
            <div className="text-secondary">
              <ManageDomainsContent />
            </div>
          </SettingsSection>
        )}
        {tab === "billing" && (
          <MembershipsManager
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

function MonetizationTab(props: { pubs: MonetizationPub[] }) {
  let { identity } = useIdentityData();
  let chargesEnabled = !!identity?.connectedAccount?.charges_enabled;

  return (
    <>
      <SettingsSection title="Payments">
        <ConnectPayments />
      </SettingsSection>
      {chargesEnabled && (
        <SettingsSection title="Your Publications">
          {props.pubs.length === 0 ? (
            <div className="text-tertiary text-sm">No publications yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {props.pubs.map((pub) => (
                <SpeedyLink
                  key={pub.uri}
                  href={pub.settingsHref}
                  className="no-underline! flex items-center justify-between gap-3 border border-border-light rounded-md px-3 py-2 hover:border-accent-contrast"
                >
                  <div className="flex flex-col">
                    <div className="font-bold text-primary">
                      {pub.name || "Untitled Publication"}
                    </div>
                    <div className="text-tertiary text-sm">
                      {pub.monetizationEnabled
                        ? "Monetization enabled"
                        : "Monetization off"}
                    </div>
                  </div>
                  <GoToArrow className="text-accent-contrast shrink-0" />
                </SpeedyLink>
              ))}
            </div>
          )}
        </SettingsSection>
      )}
    </>
  );
}

function ProTab() {
  let isPro = useIsPro();

  return isPro ? (
    <SettingsSection title="Leaflet Pro">
      <ManageProSubscription />
    </SettingsSection>
  ) : (
    <SettingsSection>
      <UpgradeToProButton />
    </SettingsSection>
  );
}
