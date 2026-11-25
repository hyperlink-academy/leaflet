import { RULES, POLICY_VERSION, AUTO_BLOCK, REVIEW_MODE } from "./policy";
import { explain } from "./reasons";
import { SIGNALS, SIGNALS_BY_ID } from "./signals";
import type {
  AccountBundle,
  Decision,
  ProposedStatus,
  Queryable,
  SignalContext,
  SignalResult,
  SignalValue,
} from "./types";

export type Review = {
  signals: Record<string, SignalResult>;
  decision: Decision;
};

// What the rules say about a set of signal values: a status and the rule that
// set it, or the costly signals a rule wants before it can be read. Pure, so
// a policy change can be replayed over the values already in review_events.
export function decide(
  values: Record<string, SignalValue | undefined>,
):
  | { status: ProposedStatus; rule: string; block: boolean }
  | { rule: string; missing: string[] } {
  let rule = RULES.find((r) => r.when(values));
  if (!rule) return { status: "needs_review", rule: "no-rule", block: false };
  let missing = (rule.run ?? []).filter((id) => !(id in values));
  if (missing.length > 0) return { rule: rule.id, missing };
  let status = rule.then ?? "needs_review";
  return {
    status,
    rule: rule.id,
    block: status === "spam" && !!rule.autoBlock,
  };
}

// The decision for signals already computed. A subject that still wants a
// costly signal is unjudged under that rule's name: it is waiting for the
// policy, not for a person, and that is also how a backfill counts what the
// costly signal would have to cover.
export function decideFrom(signals: Record<string, SignalResult>): Decision {
  let outcome = decide(
    Object.fromEntries(Object.entries(signals).map(([id, r]) => [id, r.value])),
  );
  return {
    status: "status" in outcome ? outcome.status : "unjudged",
    rule: outcome.rule,
    reasons: explain(signals),
    block: "status" in outcome && outcome.block,
  };
}

// Cheap signals, then the rules; a rule that asks for a costly signal gets it
// computed and the rules are read again.
export async function reviewAccount(
  account: AccountBundle,
  ctx: SignalContext,
  opts: { costly: boolean },
): Promise<Review> {
  let signals: Record<string, SignalResult> = {};
  for (let signal of SIGNALS) {
    if (signal.cost !== "cheap") continue;
    signals[signal.id] = await signal.compute(account, ctx, signals);
  }
  for (;;) {
    let outcome = decide(
      Object.fromEntries(
        Object.entries(signals).map(([id, r]) => [id, r.value]),
      ),
    );
    if ("status" in outcome || !opts.costly)
      return { signals, decision: decideFrom(signals) };
    for (let id of outcome.missing) {
      let signal = SIGNALS_BY_ID[id];
      if (!signal)
        throw new Error(`rule ${outcome.rule} asks for unknown signal ${id}`);
      signals[id] = await signal.compute(account, ctx, signals);
    }
  }
}

function firstSeen(account: AccountBundle): string | null {
  let dates = account.documents.flatMap((d) => d.publishedAt ?? []).sort();
  return dates[0] ?? null;
}

export async function saveLinks(db: Queryable, account: AccountBundle) {
  await db.query(`delete from document_links where author_did = $1`, [
    account.did,
  ]);
  let rows = account.documents.flatMap((d) =>
    d.links.map((l) => [d.uri, l.domain, l.url] as const),
  );
  if (rows.length === 0) return;
  await db.query(
    `insert into document_links (document, author_did, domain, url)
     select t.document, $1, t.domain, t.url
     from unnest($2::text[], $3::text[], $4::text[]) as t(document, domain, url)
     on conflict do nothing`,
    [
      account.did,
      rows.map((r) => r[0]),
      rows.map((r) => r[1]),
      rows.map((r) => r[2]),
    ],
  );
}

function subjectColumns(account: AccountBundle) {
  return {
    label: {
      handle: account.profile?.handle ?? null,
      displayName: account.profile?.displayName ?? null,
      publications: account.publications
        .slice(0, 5)
        .map((p) => ({ name: p.name, url: p.url })),
    },
    stats: {
      documents: account.documents.length,
      standalone: account.documents.filter((d) => !d.publication).length,
      publications: account.publications.length,
      followers: account.profile?.followers ?? null,
    },
  };
}

// The subject row without a proposal, so signals that read other accounts'
// labels and links can see this one before it has been judged.
export async function saveSubject(db: Queryable, account: AccountBundle) {
  let { label, stats } = subjectColumns(account);
  await db.query(
    `insert into review_subjects (kind, id, label, stats, first_seen, human_label)
     values ('account', $1, $2, $3, $4, $5)
     on conflict (kind, id) do update set
       label = excluded.label, stats = excluded.stats,
       first_seen = excluded.first_seen,
       human_label = coalesce(review_subjects.human_label, excluded.human_label)`,
    [
      account.did,
      JSON.stringify(label),
      JSON.stringify(stats),
      firstSeen(account),
      account.humanLabel,
    ],
  );
}

export async function saveReview(
  db: Queryable,
  account: AccountBundle,
  review: Review,
  run: string,
) {
  let events = [
    ...Object.entries(review.signals).map(([id, r]) => ({
      type: "signal",
      name: id,
      version: SIGNALS.find((s) => s.id === id)?.version ?? 0,
      value: r.value,
      evidence: r.evidence ?? null,
    })),
    {
      type: "decision",
      name: review.decision.rule,
      version: POLICY_VERSION,
      value: review.decision.status,
      evidence: {
        reasons: review.decision.reasons,
        block: review.decision.block,
      },
    },
  ];
  await db.query(
    `insert into review_events (run, mode, kind, subject_id, type, name, version, value, evidence)
     select $1, $2, 'account', $3, e.type, e.name, e.version, e.value, e.evidence
     from jsonb_to_recordset($4::jsonb)
       as e(type text, name text, version int, value jsonb, evidence jsonb)`,
    [run, REVIEW_MODE, account.did, JSON.stringify(events)],
  );
  await db.query(
    `update review_subjects set
       proposed_status = $2, proposed_by = $3, policy_version = $4,
       reasons = $5::jsonb, evaluated_at = now()
     where kind = 'account' and id = $1`,
    [
      account.did,
      review.decision.status,
      review.decision.rule,
      POLICY_VERSION,
      JSON.stringify(review.decision.reasons),
    ],
  );
  return {
    blocked: await applyAutoBlock(db, account.did, review.decision, run),
  };
}

// Blocks the account if its rule may and AUTO_BLOCK is on. Never touches an
// account that is already blocked, and never one an admin has said is fine,
// so an unblock sticks through every later review. The policy does not
// unblock: only a person does.
export async function applyAutoBlock(
  db: Queryable,
  did: string,
  decision: Decision,
  run: string,
  enabled = AUTO_BLOCK,
): Promise<boolean> {
  if (!decision.block || !enabled) return false;
  let { rows } = await db.query(
    `update review_subjects
     set enforced_status = 'spam', enforced_at = now(), enforced_by = null
     where kind = 'account' and id = $1 and enforced_status is null
       and human_label is distinct from 'legit'
     returning id`,
    [did],
  );
  if (rows.length === 0) return false;
  await db.query(
    `insert into review_events (run, mode, kind, subject_id, type, name, version, value, evidence)
     values ($1, 'live', 'account', $2, 'enforcement', 'block', $3, '"spam"'::jsonb, $4::jsonb)`,
    [run, did, POLICY_VERSION, JSON.stringify({ rule: decision.rule })],
  );
  return true;
}
