"use server";

import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/api";
import { getAuthIdentity } from "src/auth";
import { asAdmin } from "src/admin/asAdmin";
import { pool } from "supabase/pool";
import { forgetBlockedMemo } from "src/review/blocked";
import { POLICY_VERSION } from "src/review/policy";
import { revalidateAllPublicationPaths } from "src/utils/revalidatePublication";

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
  for (let did of dids) revalidatePath(`/p/${did}`);
  for (let row of docs.rows) {
    let uri = new AtUri(row.uri);
    revalidatePath(`/p/${uri.host}/${uri.rkey}`);
  }
  for (let row of pubs.rows)
    await revalidateAllPublicationPaths(row.uri, [row.name]);
}

async function setBlocked(
  dids: string[],
  blocked: boolean,
  evidence: Record<string, unknown>,
) {
  if (dids.length === 0) return 0;
  let identity = await getAuthIdentity();
  let { rows } = await pool.query(
    `insert into review_subjects (kind, id, enforced_status, enforced_at, enforced_by)
     select 'account', did, $2, now(), $3 from unnest($1::text[]) as did
     on conflict (kind, id) do update set
       enforced_status = excluded.enforced_status,
       enforced_at = excluded.enforced_at,
       enforced_by = excluded.enforced_by
     where review_subjects.enforced_status is distinct from excluded.enforced_status
     returning id`,
    [dids, blocked ? "spam" : null, identity?.id ?? null],
  );
  let changed = rows.map((r) => r.id as string);
  if (changed.length === 0) return 0;
  await pool.query(
    `insert into review_events (run, mode, kind, subject_id, type, name, version, value, evidence)
     select $1, 'live', 'account', did, 'human', $2, $3, $4::jsonb, $5::jsonb
     from unnest($6::text[]) as did`,
    [
      `admin-${new Date().toISOString()}`,
      blocked ? "block" : "unblock",
      POLICY_VERSION,
      JSON.stringify(blocked ? "spam" : null),
      JSON.stringify({ ...evidence, by: identity?.id ?? null }),
      changed,
    ],
  );
  forgetBlockedMemo(changed);
  await dropCachedPages(changed);
  return changed.length;
}

export async function blockAccount(args: { did: string }) {
  return asAdmin("reviewBlock", () => setBlocked([args.did], true, {}));
}

export async function unblockAccount(args: { did: string }) {
  return asAdmin("reviewBlock", () => setBlocked([args.did], false, {}));
}

// Blocks every account the policy flagged that is devoted to this site: the
// whole of one operator's farm in one decision.
export async function blockSite(args: { domain: string }) {
  return asAdmin("reviewBlock", async () => {
    let { rows } = await pool.query(
      `with latest as (
         select distinct on (subject_id) subject_id, evidence->>'domain' as domain
         from review_events
         where kind = 'account' and type = 'signal' and name = 'links.farm_accounts'
         order by subject_id, at desc
       )
       select s.id from review_subjects s
       join latest l on l.subject_id = s.id
       where s.kind = 'account' and l.domain = $1
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
