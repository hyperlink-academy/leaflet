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
import { AccountSwitcher } from "./AccountSwitcher";
import { LoginContent } from "components/LoginButton";
import { resolveSavedAccounts, switchAccount } from "actions/savedAccounts";
import {
  accountSwitcherEnabled,
  mutateSavedAccounts,
  readSavedAccountEntries,
  removeSavedAccountEntry,
} from "src/hooks/useSavedAccounts";

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
  let [addAccountOpen, setAddAccountOpen] = useState(false);
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
        <AccountSwitcher
          onClose={() => {
            setOpen(false);
            setSidebarOpen(false);
          }}
          onAddAccount={() => setAddAccountOpen(true)}
        />
        <button
          type="button"
          className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
          onClick={async () => {
            setOpen(false);
            setSidebarOpen(false);
            let currentIdentity = identity?.id;
            let currentEmail = identity?.email;
            await fetch("/api/auth/logout");
            if (currentIdentity) removeSavedAccountEntry(currentIdentity);
            mutateSavedAccounts();
            // When the switcher flag is on, logging out of this account falls
            // through to the next saved session, mirroring the switcher; skip
            // entries that no longer authenticate. Fully logged out only when
            // none are left (or the flag is off).
            let entries = readSavedAccountEntries();
            if (entries.length > 0) {
              let accounts = await resolveSavedAccounts(
                entries.map((e) => e.token),
              );
              if (accountSwitcherEnabled(currentEmail, accounts)) {
                for (let account of accounts) {
                  let result = await switchAccount(account.token);
                  if (result.ok) {
                    window.location.href = "/home";
                    return;
                  }
                  removeSavedAccountEntry(account.identity.id);
                }
                mutateSavedAccounts();
              }
            }
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
    <Modal
      open={addAccountOpen}
      onOpenChange={setAddAccountOpen}
      className="w-full!"
    >
      <LoginContent
        addAccount
        open={addAccountOpen}
        onSuccess={() => setAddAccountOpen(false)}
      />
    </Modal>
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
