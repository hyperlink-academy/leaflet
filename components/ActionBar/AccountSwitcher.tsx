"use client";
import { useState } from "react";
import { Avatar } from "components/Avatar";
import { AddSmall } from "components/Icons/AddSmall";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { GoBackTiny } from "components/Icons/GoBackTiny";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { RefreshSmall } from "components/Icons/RefreshSmall";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import {
  accountSwitcherEnabled,
  mutateSavedAccounts,
  removeSavedAccountEntry,
  switchToSavedAccount,
  upsertSavedAccountEntry,
  useSavedAccounts,
  type SavedAccountEntry,
} from "src/hooks/useSavedAccounts";

export function savedAccountLabel(entry: SavedAccountEntry) {
  return entry.displayName || entry.handle || entry.email || "Account";
}

function useOtherAccounts() {
  let { identity } = useIdentityData();
  let { data: entries } = useSavedAccounts();
  return {
    identity,
    entries,
    otherAccounts: (entries ?? []).filter((e) => e.identity !== identity?.id),
  };
}

export const SwitchAccountItem = (props: {
  onShowAccounts: () => void;
  onAddAccount: () => void;
  onClose: () => void;
}) => {
  let { identity, entries, otherAccounts } = useOtherAccounts();
  if (!accountSwitcherEnabled(identity?.email, entries)) return null;
  return (
    <>
      <button
        type="button"
        className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
        onClick={() => {
          if (otherAccounts.length > 0) {
            props.onShowAccounts();
          } else {
            props.onClose();
            props.onAddAccount();
          }
        }}
      >
        <RefreshSmall />
        Switch Account
        {otherAccounts.length > 0 && <ArrowRightTiny className="ml-auto" />}
      </button>
      <hr className="border-border-light border-dashed" />
    </>
  );
};

export const AccountList = (props: {
  onBack: () => void;
  onAddAccount: () => void;
  onClose: () => void;
}) => {
  let { otherAccounts } = useOtherAccounts();
  let [pendingToken, setPendingToken] = useState<string | null>(null);
  let toaster = useToaster();

  const onSwitch = async (entry: SavedAccountEntry) => {
    if (pendingToken) return;
    setPendingToken(entry.token);
    let ok = await switchToSavedAccount(entry);
    if (ok) {
      upsertSavedAccountEntry(entry);
      // Full navigation instead of mutating in place: Replicache, SWR caches,
      // and realtime channels are all keyed to the previous identity.
      window.location.href = "/home";
      return;
    }
    removeSavedAccountEntry(entry.identity);
    mutateSavedAccounts();
    setPendingToken(null);
    toaster({
      content: (
        <div className="font-bold">That session expired, please log in again!</div>
      ),
      type: "error",
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
        onClick={props.onBack}
      >
        <GoBackTiny />
        Back
      </button>
      <hr className="border-border-light border-dashed" />
      {otherAccounts.map((entry) => (
        <button
          key={entry.token}
          type="button"
          disabled={!!pendingToken}
          className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
          onClick={() => onSwitch(entry)}
        >
          <Avatar src={entry.avatar} displayName={savedAccountLabel(entry)} />
          <div className="flex flex-col leading-tight min-w-0 grow">
            <span className="truncate">{savedAccountLabel(entry)}</span>
            {entry.handle && (
              <span className="text-xs text-secondary truncate">
                @{entry.handle}
              </span>
            )}
          </div>
          {pendingToken === entry.token && (
            <LoadingTiny className="animate-spin shrink-0" />
          )}
        </button>
      ))}
      <button
        type="button"
        className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
        onClick={() => {
          props.onClose();
          props.onAddAccount();
        }}
      >
        <AddSmall />
        Add Account
      </button>
    </div>
  );
};
