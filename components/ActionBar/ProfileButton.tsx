"use client";
import { Avatar } from "components/Avatar";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { AccountSmall } from "components/Icons/AccountSmall";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { useIsMobile } from "src/hooks/isMobile";
import { LogoutSmall } from "components/Icons/LogoutSmall";
import { mutate } from "swr";
import { SpeedyLink } from "components/SpeedyLink";
import { Popover } from "components/Popover";
import { Modal } from "components/Modal";
import {
  InlineUpgradeToPro,
  UpgradeContent,
} from "app/(app)/lish/[did]/[publication]/UpgradeModal";
import { ManageProSubscription } from "app/(app)/lish/[did]/[publication]/dashboard/settings/ProSettings";
import { ManageDomains } from "components/Domains/ManageDomains";
import { WebSmall } from "components/Icons/WebSmall";
import {
  useIsPro,
  useCanSeePro,
  useCanSeePayments,
} from "src/hooks/useEntitlement";
import { useState } from "react";
import { LeafletPro } from "components/Icons/LeafletPro";
import { AnalyticsSmall } from "components/Icons/AnalyticsSmall";
import { ConnectPayments } from "components/StripeConnect/ConnectPayments";
import { useSidebarStore } from "./Sidebar";

export const ProfileButton = () => {
  let setSidebarOpen = useSidebarStore((s) => s.setOpen);
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);
  let isMobile = useIsMobile();
  let isPro = useIsPro();
  let canSeePro = useCanSeePro();
  let canSeePayments = useCanSeePayments();
  let [open, setOpen] = useState(false);
  let [domainsOpen, setDomainsOpen] = useState(false);
  let [proOpen, setProOpen] = useState(false);
  let [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
    <Popover
      asChild
      open={open}
      onOpenChange={setOpen}
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="w-xs py-1! z-[60]!"
      trigger={
        <ActionButton
          labelOnMobile={false}
          icon={
            record ? (
              <Avatar
                src={record.avatar}
                displayName={record.displayName || record.handle}
              />
            ) : (
              <AccountSmall />
            )
          }
          label={
            record
              ? record.displayName || record.handle
              : identity?.email || "Account"
          }
          className={`font-bold`}
        />
      }
    >
      <div className="flex flex-col gap-0.5">
        {record?.handle && (
          <>
            <SpeedyLink
              className="no-underline! menuItem -mx-[8px]"
              href={`/p/${record.handle}`}
              onClick={() => {
                setOpen(false);
                setSidebarOpen(false);
              }}
            >
              <button type="button" className="flex gap-2 ">
                <AccountSmall />
                View Profile
              </button>
            </SpeedyLink>
          </>
        )}

        <button
          type="button"
          className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
          onClick={() => {
            setOpen(false);
            setDomainsOpen(true);
          }}
        >
          <WebSmall />
          Domain Settings
        </button>
        {identity && (
          <SpeedyLink
            className="no-underline! menuItem -mx-[8px]"
            href="/memberships"
            onClick={() => {
              setOpen(false);
              setSidebarOpen(false);
            }}
          >
            <button type="button" className="flex gap-2">
              <AnalyticsSmall />
              Memberships &amp; Billing
            </button>
          </SpeedyLink>
        )}
        <hr className="border-border-light border-dashed" />

        {canSeePro && isPro && (
          <>
            <button
              type="button"
              className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
              onClick={() => {
                setOpen(false);
                setProOpen(true);
              }}
            >
              <LeafletPro />
              Manage Pro Subscription
            </button>
            <hr className="border-border-light border-dashed" />
          </>
        )}
        {identity && canSeePayments && (
          <>
            <Modal
              trigger={
                <div className="menuItem -mx-[8px] ">
                  <AnalyticsSmall />
                  Payments
                </div>
              }
            >
              <div className="flex flex-col gap-3 max-w-prose">
                <div className="font-bold text-primary text-lg">Payments</div>
                <ConnectPayments />
              </div>
            </Modal>
            <hr className="border-border-light border-dashed" />
          </>
        )}
        <button
          type="button"
          className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
          onClick={async () => {
            setOpen(false);
            setSidebarOpen(false);
            await fetch("/api/auth/logout");
            mutate("identity", null);
          }}
        >
          <LogoutSmall />
          Log Out
        </button>
        {canSeePro && !isPro && (
          <>
            {" "}
            <hr className="border-border-light border-dashed" />
            <div className="py-2">
              <div className="p-2 accent-container">
                <InlineUpgradeToPro
                  compact
                  onClick={() => {
                    setOpen(false);
                    setUpgradeOpen(true);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Popover>
    <ManageDomains open={domainsOpen} onOpenChange={setDomainsOpen} />
    {canSeePro && isPro && (
      <Modal
        className="w-md max-w-full"
        open={proOpen}
        onOpenChange={setProOpen}
      >
        <ManageProSubscription />
      </Modal>
    )}
    {canSeePro && !isPro && (
      <Modal
        className="sm:w-fit w-[90vw]"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      >
        <UpgradeContent />
      </Modal>
    )}
    </>
  );
};
