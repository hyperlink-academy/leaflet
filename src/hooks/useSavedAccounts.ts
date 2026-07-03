"use client";
import useSWR, { mutate } from "swr";
import { resolveSavedAccounts, type SavedAccount } from "actions/savedAccounts";

export type { SavedAccount };

// Sessions this browser can switch between, newest first. Each entry's token
// is an email_auth_tokens id — possession is the credential, so the list only
// ever contains sessions this browser itself logged into. Display data is not
// stored here; it's resolved fresh through resolveSavedAccounts.
export type SavedAccountEntry = { token: string; identity: string };

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

export function useSavedAccounts() {
  return useSWR("saved-accounts", async () => {
    const entries = readSavedAccountEntries();
    if (entries.length === 0) return [];
    const accounts = await resolveSavedAccounts(entries.map((e) => e.token));
    // Prune entries whose token no longer authenticates (logged out elsewhere)
    // or that collapsed into another entry's identity via an account merge.
    const valid = new Set(accounts.map((a) => a.token));
    if (entries.some((e) => !valid.has(e.token)))
      writeSavedAccountEntries(entries.filter((e) => valid.has(e.token)));
    return accounts;
  });
}
