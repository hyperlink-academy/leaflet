import { supabaseServerClient } from "supabase/serverClient";

// A blocked account is one an admin has confirmed as spam: it can't publish,
// the appview stops indexing it, its pages 404 and its posts leave the feeds.
// The review policy's own proposals never block anyone.
//
// Every lookup fails open. A review-table outage must not take down
// publishing or empty the feeds.

const MEMO_MS = 60_000;
const MEMO_MAX = 5000;
const memo = new Map<string, { blocked: boolean; at: number }>();

export async function blockedAmong(dids: string[]): Promise<Set<string>> {
  let unique = [...new Set(dids)];
  if (unique.length === 0) return new Set();
  let { data, error } = await supabaseServerClient
    .from("review_subjects")
    .select("id")
    .eq("kind", "account")
    .eq("enforced_status", "spam")
    .in("id", unique);
  if (error) {
    console.error("[review] blocked lookup failed:", error);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.id));
}

// Memoized for a minute per account, for callers that ask about the same
// account again and again (the appview sees every record an account writes).
export async function isBlockedAccount(did: string): Promise<boolean> {
  let now = Date.now();
  let known = memo.get(did);
  if (known && now - known.at < MEMO_MS) return known.blocked;
  let blocked = (await blockedAmong([did])).has(did);
  if (memo.size >= MEMO_MAX) memo.clear();
  memo.set(did, { blocked, at: now });
  return blocked;
}

export function forgetBlockedMemo(dids: string[]) {
  for (let did of dids) memo.delete(did);
}

// The account that wrote a record, from its at-uri.
export function authorOf(uri: string): string | null {
  return uri.startsWith("at://") ? uri.slice(5).split("/")[0] || null : null;
}
