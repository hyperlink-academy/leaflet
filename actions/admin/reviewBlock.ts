"use server";

import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/api";
import { getAuthIdentity } from "src/auth";
import { asAdmin } from "src/admin/asAdmin";
import { pool } from "supabase/pool";
import { forgetBlockedMemo } from "src/review/blocked";
import { POLICY_VERSION } from "src/review/policy";
import { revalidateAllPublicationPaths } from "src/utils/revalidatePublication";

const REVALIDATE_CHUNK = 10;

// Cached pages of a blocked account otherwise keep serving until they expire.
async function dropCachedPages(dids: string[]) {
  let [docs, pubs] = await Promise.all([
    pool.query(`select uri from documents where identity_did = any($1)`, [
      dids,
    ]),
    pool.query(
      `select uri, name from publications where identity_did = any($1)`,
      [dids],
    ),
  ]);
  for (let did of dids) revalidatePath(`/p/${did}`, "layout");
  for (let row of docs.rows) {
    let uri = new AtUri(row.uri);
    revalidatePath(`/p/${uri.host}/${uri.rkey}`);
  }
  for (let i = 0; i < pubs.rows.length; i += REVALIDATE_CHUNK)
    await Promise.all(
      pubs.rows
        .slice(i, i + REVALIDATE_CHUNK)
        .map((row) => revalidateAllPublicationPaths(row.uri, [row.name])),
    );
}

// The block and its log entry land together or not at all. Dropping cached
// pages runs for every account asked about, changed or not, so pressing the
// button again finishes a cache drop that failed the first time.
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
          `insert into review_subjects (kind, id, enforced_status, enforced_at, enforced_by)
           select 'account', did, 'spam', now(), $2 from unnest($1::text[]) as did
           on conflict (kind, id) do update set
             enforced_status = excluded.enforced_status,
             enforced_at = excluded.enforced_at,
             enforced_by = excluded.enforced_by
           where review_subjects.enforced_status is null
           returning id`,
          [dids, by],
        )
      : await client.query(
          `update review_subjects
           set enforced_status = null, enforced_at = now(), enforced_by = $2
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
    await dropCachedPages(dids);
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

// Blocks every account the policy flagged that is devoted to this site and
// has at least one other throwaway account devoted to it too: the whole of
// one operator's farm in one decision.
export async function blockSite(args: { domain: string }) {
  return asAdmin("reviewBlock", async () => {
    let { rows } = await pool.query(
      `with latest as (
         select distinct on (subject_id) subject_id,
           evidence->>'domain' as domain, (value #>> '{}')::int as peers
         from review_events
         where kind = 'account' and type = 'signal' and name = 'links.farm_accounts'
         order by subject_id, at desc
       )
       select s.id from review_subjects s
       join latest l on l.subject_id = s.id
       where s.kind = 'account' and l.domain = $1 and l.peers > 0
         and s.proposed_status in ('spam', 'held')`,
      [args.domain],
    );
    return setBlocked(
      rows.map((r) => r.id as string),
      true,
      { site: args.domain },
    );
  });
}
