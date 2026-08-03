"use client";
import { Avatar } from "components/Avatar";
import { ActionButton } from "../ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { AccountSmall } from "components/Icons/AccountSmall";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { useIsMobile } from "src/hooks/isMobile";
import { LogoutSmall } from "components/Icons/LogoutSmall";
import { mutate } from "swr";
import { SpeedyLink } from "components/SpeedyLink";
import { Popover } from "components/Popover";
import { Modal } from "components/Modal";
import { UpgradeContent } from "app/(app)/lish/[did]/[publication]/UpgradeModal";
import { useIsPro, useCanSeePro } from "src/hooks/useEntitlement";
import { useState } from "react";
import { LeafletPro } from "components/Icons/LeafletPro";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { SubscribersSmall } from "components/Icons/SubscribersSmall";
import { useSidebarStore } from "../Sidebar";
import { AccountList } from "../AccountSwitcher";
import { LoginContent } from "components/LoginButton";
import {
  mutateSavedAccounts,
  readSavedAccountEntries,
  removeSavedAccountEntry,
  switchToSavedAccount,
} from "src/hooks/useSavedAccounts";

export const ProfileButton = () => {
  let setSidebarOpen = useSidebarStore((s) => s.setOpen);
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);
  let isMobile = useIsMobile();
  let isPro = useIsPro();
  let canSeePro = useCanSeePro();
  let [open, setOpen] = useState(false);
  let [addAccountOpen, setAddAccountOpen] = useState(false);
  let [upgradeOpen, setUpgradeOpen] = useState(false);

  // Close the menu but leave the mobile sidebar open: this component (and the
  // add-account modal's state) is mounted inside the sidebar's Dialog, so
  // closing the sidebar would unmount the modal right as it opens.
  let openAddAccount = () => {
    setOpen(false);
    setAddAccountOpen(true);
  };

  let closeMenu = () => {
    setOpen(false);
    setSidebarOpen(false);
  };

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
          <AccountList
            current={{
              label:
                record?.displayName ||
                record?.handle ||
                identity?.email ||
                "Account",
              handle: record?.handle ?? undefined,
              avatar: record?.avatar ?? undefined,
            }}
            onAddAccount={openAddAccount}
          />
          <hr className="border-border-light border-dashed" />

          {record?.handle && (
            <SpeedyLink
              className="no-underline! menuItem -mx-[8px]"
              href={`/p/${record.handle}`}
              onClick={closeMenu}
            >
              <button type="button" className="flex gap-2">
                <AccountSmall />
                View Profile
              </button>
            </SpeedyLink>
          )}
          {identity && (
            <SpeedyLink
              className="no-underline! menuItem -mx-[8px]"
              href="/subscriptions"
              onClick={closeMenu}
            >
              <button type="button" className="flex gap-2">
                <SubscribersSmall />
                Your Subscriptions
              </button>
            </SpeedyLink>
          )}
          {identity && (
            <SpeedyLink
              className="no-underline! menuItem -mx-[8px]"
              href="/settings"
              onClick={closeMenu}
            >
              <button type="button" className="flex gap-2">
                <SettingsSmall />
                Settings
              </button>
            </SpeedyLink>
          )}
          {canSeePro && !isPro && (
            <button
              type="button"
              className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
              onClick={() => {
                setOpen(false);
                setUpgradeOpen(true);
              }}
            >
              <LeafletPro />
              Get Leaflet Pro
            </button>
          )}
          <button
            type="button"
            className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
            onClick={async () => {
              closeMenu();
              let currentIdentity = identity?.id;
              // Logging out of this account falls through to the most recent
              // other saved session. Revoking the old session and installing the
              // next happens in one request so the open page never sits on a
              // cleared cookie, which flashed an error before the navigation
              // landed.
              let entries = readSavedAccountEntries();
              let next = entries.find((e) => e.identity !== currentIdentity);
              if (next) {
                let ok = await switchToSavedAccount(next, {
                  logoutCurrent: true,
                });
                if (ok) {
                  if (currentIdentity) removeSavedAccountEntry(currentIdentity);
                  window.location.href = "/home";
                  return;
                }
                // The fallback session was revoked elsewhere — drop it and log
                // out normally.
                removeSavedAccountEntry(next.identity);
              }
              await fetch("/api/auth/logout");
              if (currentIdentity) removeSavedAccountEntry(currentIdentity);
              mutateSavedAccounts();
              mutate("identity", null);
            }}
          >
            <LogoutSmall />
            Log Out
          </button>
        </div>
      </Popover>
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
