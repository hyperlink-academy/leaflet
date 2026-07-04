"use client";
import useSWR, { mutate } from "swr";
import {
  resolveSavedAccounts,
  type ResolvedAccount,
} from "actions/savedAccounts";

export type SavedAccount = ResolvedAccount & {
  profile: {
    handle: string | null;
    displayName: string | null;
    avatar: string | null;
  } | null;
};

// Sessions this browser can switch between, newest first. Each entry's token
// is an email_auth_tokens id — possession is the credential, so the list only
// ever contains sessions this browser itself logged into. The display fields
// are a snapshot so the switcher renders instantly; they're refreshed from the
// server on every resolve and session recording, never trusted as current.
export type SavedAccountEntry = {
  token: string;
  identity: string;
  email?: string | null;
  did?: string | null;
  handle?: string | null;
  displayName?: string | null;
  avatar?: string | null;
};

export function entryFromAccount(account: SavedAccount): SavedAccountEntry {
  return {
    token: account.token,
    identity: account.identity.id,
    email: account.identity.email,
    did: account.identity.atp_did,
    handle: account.profile?.handle ?? null,
    displayName: account.profile?.displayName ?? null,
    avatar: account.profile?.avatar ?? null,
  };
}

function accountFromEntry(entry: SavedAccountEntry): SavedAccount {
  return {
    token: entry.token,
    identity: {
      id: entry.identity,
      email: entry.email ?? null,
      atp_did: entry.did ?? null,
    },
    profile:
      entry.handle || entry.displayName || entry.avatar
        ? {
            handle: entry.handle ?? null,
            displayName: entry.displayName ?? null,
            avatar: entry.avatar ?? null,
          }
        : null,
  };
}

const STORAGE_KEY = "leaflet-saved-accounts";
const MAX_ENTRIES = 12;

export function readSavedAccountEntries(): SavedAccountEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedAccountEntry =>
        !!e && typeof e.token === "string" && typeof e.identity === "string",
    );
  } catch {
    return [];
  }
}

function writeSavedAccountEntries(entries: SavedAccountEntry[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES)),
    );
  } catch {}
}

// Dedupes by identity and moves the entry to the front (MRU order).
export function upsertSavedAccountEntry(entry: SavedAccountEntry) {
  writeSavedAccountEntries([
    entry,
    ...readSavedAccountEntries().filter((e) => e.identity !== entry.identity),
  ]);
}

export function removeSavedAccountEntry(identity: string) {
  writeSavedAccountEntries(
    readSavedAccountEntries().filter((e) => e.identity !== identity),
  );
}

export function mutateSavedAccounts() {
  mutate("saved-accounts");
}

// Feature flag while the switcher is dogfooded: the UI (and the
// logout-falls-through-to-next-account behavior) only activates when the
// active identity or one of the saved accounts is this email. Sessions are
// still recorded for everyone so the flag can be discovered from the list.
export const ACCOUNT_SWITCHER_FLAG_EMAIL = "jared@hyperlink.academy";

export function accountSwitcherEnabled(
  currentEmail: string | null | undefined,
  accounts: ResolvedAccount[] | undefined,
) {
  return (
    currentEmail === ACCOUNT_SWITCHER_FLAG_EMAIL ||
    !!accounts?.some(
      (a) => a.identity.email === ACCOUNT_SWITCHER_FLAG_EMAIL,
    )
  );
}

export function useSavedAccounts() {
  return useSWR(
    "saved-accounts",
    async () => {
      const entries = readSavedAccountEntries();
      if (entries.length === 0) return [];
      const resolved = new Map(
        (await resolveSavedAccounts(entries.map((e) => e.token))).map((a) => [
          a.token,
          a,
        ]),
      );
      // Drop entries whose token no longer authenticates (logged out
      // elsewhere). Display snapshots are kept as-is — stale until the account
      // is next active.
      const kept = entries.filter((e) => resolved.has(e.token));
      if (kept.length !== entries.length) writeSavedAccountEntries(kept);
      return kept.map((e) => ({
        ...resolved.get(e.token)!,
        profile: accountFromEntry(e).profile,
      }));
    },
    // The cached snapshots render the list immediately while the authoritative
    // resolve is in flight.
    { fallbackData: readSavedAccountEntries().map(accountFromEntry) },
  );
}
