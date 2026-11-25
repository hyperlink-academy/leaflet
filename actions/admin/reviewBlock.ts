"use server";

import { getAuthIdentity } from "src/auth";
import { asAdmin } from "src/admin/asAdmin";
import { pool } from "supabase/pool";
import { forgetBlockedMemo } from "src/review/blocked";
import { POLICY_VERSION } from "src/review/policy";
import { dropCachedPages } from "src/review/dropCachedPages";

// The block and its log entry land together or not at all. Dropping cached
// pages runs for every account asked about, changed or not, so pressing the
// button again finishes a cache drop that failed the first time. The
// admin's decision is also kept as a label: a block marks the account as
// spam for the signals that learn from labels, and an unblock marks it as
// fine, which is what stops the policy from blocking it again.
async function setBlocked(
  requested: string[],
  blocked: boolean,
  evidence: Record<string, unknown>,
) {
  let dids = [...new Set(requested)];
  if (dids.length === 0) return 0;
  let identity = await getAuthIdentity();
  let by = identity?.id ?? null;
  let changed: string[];
  let client = await pool.connect();
  try {
    await client.query("begin");
    let { rows } = blocked
      ? await client.query(
          `insert into review_subjects (kind, id, enforced_status, enforced_at, enforced_by, human_label)
           select 'account', did, 'spam', now(), $2, 'spam' from unnest($1::text[]) as did
           on conflict (kind, id) do update set
             enforced_status = excluded.enforced_status,
             enforced_at = excluded.enforced_at,
             enforced_by = excluded.enforced_by,
             human_label = 'spam'
           where review_subjects.enforced_status is null
           returning id`,
          [dids, by],
        )
      : await client.query(
          `update review_subjects
           set enforced_status = null, enforced_at = now(), enforced_by = $2,
             human_label = 'legit'
           where kind = 'account' and id = any($1) and enforced_status is not null
           returning id`,
          [dids, by],
        );
    changed = rows.map((r) => r.id as string);
    if (changed.length > 0)
      await client.query(
        `insert into review_events (run, mode, kind, subject_id, type, name, version, value, evidence)
         select $1, 'live', 'account', did, 'human', $2, $3, $4::jsonb, $5::jsonb
         from unnest($6::text[]) as did`,
        [
          `admin-${new Date().toISOString()}`,
          blocked ? "block" : "unblock",
          POLICY_VERSION,
          JSON.stringify(blocked ? "spam" : null),
          JSON.stringify({ ...evidence, by }),
          changed,
        ],
      );
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  forgetBlockedMemo(dids);
  try {
    await dropCachedPages(pool, dids);
  } catch (e) {
    console.error("[admin/reviewBlock] cache drop failed:", e);
    throw new Error(
      `${blocked ? "Blocked" : "Unblocked"} ${changed.length} accounts, but clearing their cached pages failed. Press the button again to retry; otherwise the pages update within the hour.`,
    );
  }
  return changed.length;
}

export async function blockAccount(args: { did: string }) {
  return asAdmin("reviewBlock", () => setBlocked([args.did], true, {}));
}

export async function unblockAccount(args: { did: string }) {
  return asAdmin("reviewBlock", () => setBlocked([args.did], false, {}));
}

// Blocks every account the policy flagged with a link-farm or known-spam-site
// reason about this site: the whole of one operator's farm in one decision.
export async function blockSite(args: { domain: string }) {
  return asAdmin("reviewBlock", async () => {
    let { rows } = await pool.query(
      `select s.id from review_subjects s
       where s.kind = 'account' and s.proposed_status in ('spam', 'needs_review')
         and exists (
           select 1 from jsonb_array_elements(s.reasons) r
           where r->>'code' in ('link_farm', 'known_spam_site')
             and r->>'site' = $1)`,
      [args.domain],
    );
    return setBlocked(
      rows.map((r) => r.id as string),
      true,
      { site: args.domain },
    );
  });
}
