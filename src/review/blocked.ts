import { supabaseServerClient } from "supabase/serverClient";

// A blocked account can't publish, the appview stops indexing it, its pages
// 404 and its posts leave the feeds. Its owner sees a banner in the app. An
// admin blocks, and so does the policy for the rules allowed to (see
// applyAutoBlock in run.ts). A proposal on its own blocks nobody.
//
// Every lookup fails open. A review-table outage must not take down
// publishing or empty the feeds.

// Where someone writes to dispute a block. Everything the account's owner
// sees about it names this: the banner in the app and the publish refusal.
export const DISPUTE_EMAIL = "contact@leaflet.pub";

// Page metadata for anything a blocked account published. The page is a 404
// like any other, so its metadata says nothing of the content or the block.
export const BLOCKED_METADATA = {
  title: "404",
  robots: { index: false, follow: false },
};

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

// Memoized for a minute per account, for the appview, which asks about the
// same account for every record it writes. Page renders must not use this: a
// stale "not blocked" there gets baked into a page cached for an hour.
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
