"use client";
import { useState } from "react";
import { Avatar } from "components/Avatar";
import { AddSmall } from "components/Icons/AddSmall";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { switchAccount } from "actions/savedAccounts";
import {
  accountSwitcherEnabled,
  mutateSavedAccounts,
  removeSavedAccountEntry,
  upsertSavedAccountEntry,
  useSavedAccounts,
  type SavedAccountEntry,
} from "src/hooks/useSavedAccounts";

export function savedAccountLabel(entry: SavedAccountEntry) {
  return entry.displayName || entry.handle || entry.email || "Account";
}

// Menu rows for switching to the other sessions this browser holds, plus an
// entry to log into an additional account. Rendered inside the ProfileButton
// popover; the add-account modal lives outside the popover (which unmounts its
// content on close), so opening it is delegated to the parent.
export const AccountSwitcher = (props: {
  onAddAccount: () => void;
  onClose: () => void;
}) => {
  let { identity } = useIdentityData();
  let { data: entries } = useSavedAccounts();
  let [pendingToken, setPendingToken] = useState<string | null>(null);
  let toaster = useToaster();

  let otherAccounts = (entries ?? []).filter(
    (e) => e.identity !== identity?.id,
  );

  if (!accountSwitcherEnabled(identity?.email, entries)) return null;

  const onSwitch = async (entry: SavedAccountEntry) => {
    if (pendingToken) return;
    setPendingToken(entry.token);
    let result = await switchAccount(entry.token);
    if (result.ok) {
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
    <>
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
      <hr className="border-border-light border-dashed" />
    </>
  );
};
