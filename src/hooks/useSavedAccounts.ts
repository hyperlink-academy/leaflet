"use client";
import useSWR, { mutate } from "swr";

// Sessions this browser can switch between, newest first. Each entry's token
// is an email_auth_tokens id — possession is the credential, so the list only
// ever contains sessions this browser itself logged into. The display fields
// are a snapshot from when the account was last active. The list is never
// validated ahead of time: a stale snapshot or a revoked token is only
// discovered when the entry is switched to, and failure removes it.
export type SavedAccountEntry = {
  token: string;
  identity: string;
  email?: string | null;
  did?: string | null;
  handle?: string | null;
  displayName?: string | null;
  avatar?: string | null;
};

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

export async function switchToSavedAccount(
  entry: SavedAccountEntry,
  opts?: { logoutCurrent?: boolean },
): Promise<boolean> {
  try {
    let res = await fetch("/api/auth/switch-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: entry.token,
        logoutCurrent: !!opts?.logoutCurrent,
      }),
    });
    if (!res.ok) return false;
    let body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

export function useSavedAccounts() {
  return useSWR("saved-accounts", () => readSavedAccountEntries(), {
    fallbackData: readSavedAccountEntries(),
  });
}
