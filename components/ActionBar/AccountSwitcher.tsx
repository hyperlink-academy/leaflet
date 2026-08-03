"use client";
import { useState } from "react";
import { Avatar } from "components/Avatar";
import { AddSmall } from "components/Icons/AddSmall";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import {
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

// The signed-in accounts this browser can switch between: the current account
// (highlighted, from live profile data) first, then the saved others, then an
// add-account button.
export const AccountList = (props: {
  current: { label: string; handle?: string; avatar?: string };
  onAddAccount: () => void;
}) => {
  let { identity } = useIdentityData();
  let { data: entries } = useSavedAccounts();
  let otherAccounts = (entries ?? []).filter(
    (e) => e.identity !== identity?.id,
  );
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
        <div className="font-bold">
          That session expired, please log in again!
        </div>
      ),
      type: "error",
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="menuItem -mx-[8px] bg-[var(--accent-light)] cursor-default items-center">
        <Avatar src={props.current.avatar} displayName={props.current.label} />
        <div className="flex flex-col leading-tight min-w-0 grow">
          <span className="truncate">{props.current.label}</span>
          {props.current.handle && (
            <span className="text-xs text-secondary truncate">
              @{props.current.handle}
            </span>
          )}
        </div>
      </div>
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
        onClick={props.onAddAccount}
      >
        <AddSmall />
        Add Account
      </button>
    </div>
  );
};
