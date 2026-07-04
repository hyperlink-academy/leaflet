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
  type SavedAccount,
  entryFromAccount,
  mutateSavedAccounts,
  removeSavedAccountEntry,
  upsertSavedAccountEntry,
  useSavedAccounts,
} from "src/hooks/useSavedAccounts";

export function savedAccountLabel(account: SavedAccount) {
  return (
    account.profile?.displayName ||
    account.profile?.handle ||
    account.identity.email ||
    "Account"
  );
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
  let { data: accounts } = useSavedAccounts();
  let [pendingToken, setPendingToken] = useState<string | null>(null);
  let toaster = useToaster();

  let otherAccounts = (accounts ?? []).filter(
    (a) => a.identity.id !== identity?.id,
  );

  if (!accountSwitcherEnabled(identity?.email, accounts)) return null;

  const onSwitch = async (account: SavedAccount) => {
    if (pendingToken) return;
    setPendingToken(account.token);
    let result = await switchAccount(account.token);
    if (result.ok) {
      upsertSavedAccountEntry(entryFromAccount(account));
      // Full navigation instead of mutating in place: Replicache, SWR caches,
      // and realtime channels are all keyed to the previous identity.
      window.location.href = "/home";
      return;
    }
    removeSavedAccountEntry(account.identity.id);
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
      {otherAccounts.map((account) => (
        <button
          key={account.token}
          type="button"
          disabled={!!pendingToken}
          className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
          onClick={() => onSwitch(account)}
        >
          <Avatar
            src={account.profile?.avatar}
            displayName={savedAccountLabel(account)}
          />
          <div className="flex flex-col leading-tight min-w-0 grow">
            <span className="truncate">{savedAccountLabel(account)}</span>
            {account.profile?.handle && (
              <span className="text-xs text-secondary truncate">
                @{account.profile.handle}
              </span>
            )}
          </div>
          {pendingToken === account.token && (
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
