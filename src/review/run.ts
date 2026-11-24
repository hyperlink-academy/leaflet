import { RULES, POLICY_VERSION, REVIEW_MODE } from "./policy";
import { SIGNALS, SIGNALS_BY_ID } from "./signals";
import type {
  AccountBundle,
  Decision,
  Queryable,
  SignalContext,
  SignalResult,
  SignalValue,
} from "./types";

export type Review = {
  signals: Record<string, SignalResult>;
  decision: Decision;
};

// What the rules say about a set of signal values: a decision, or the costly
// signals a rule wants before it can be read. Pure, so a policy change can be
// replayed over the values already in review_events.
export function decide(
  values: Record<string, SignalValue | undefined>,
): { decision: Decision } | { rule: string; missing: string[] } {
  let rule = RULES.find((r) => r.when(values));
  if (!rule)
    return {
      decision: { status: "pending", rule: "no-rule", needsHuman: true },
    };
  let missing = (rule.run ?? []).filter((id) => !(id in values));
  if (missing.length > 0) return { rule: rule.id, missing };
  return {
    decision: {
      status: rule.then ?? "pending",
      rule: rule.id,
      needsHuman: !!rule.escalate,
    },
  };
}

// Cheap signals, then the rules; a rule that asks for a costly signal gets it
// computed and the rules are read again. With costly signals off, a subject
// that reaches such a rule stays pending under that rule's name, which is
// also how a backfill counts what the costly signal would have to cover.
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
    if ("decision" in outcome) return { signals, decision: outcome.decision };
    if (!opts.costly)
      return {
        signals,
        decision: { status: "pending", rule: outcome.rule, needsHuman: false },
      };
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
       first_seen = excluded.first_seen, human_label = excluded.human_label`,
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
      evidence: { needsHuman: review.decision.needsHuman },
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
       needs_human = $5, evaluated_at = now()
     where kind = 'account' and id = $1`,
    [
      account.did,
      review.decision.status,
      review.decision.rule,
      POLICY_VERSION,
      review.decision.needsHuman,
    ],
  );
}
