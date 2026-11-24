# Review system

Goal: one system for deciding whether an account, publication or document is
authentic, built so that a new signal is one file, a new workflow is one rule,
and every decision can be explained, measured and replayed later.

It replaces the publication-only classifier on `publication-spam-review`
(`src/publicationReview/`), which becomes one signal among several.

## Why the current shape can't grow

Audited 2026-11-24 against the m-oazzam ring (one promoter account, four
throwaway author accounts, ~50 standalone documents each carrying one client
backlink):

- The only subject is a publication. Standalone documents are never reviewed
  (`publishLeaflet.ts` requests review only with a `publication_uri`) and can't
  be held (`dropHeld` filters by publication URI).
- The only signal is one LLM call over one publication's five posts. Nothing
  compares accounts, so a shared roster of link domains is invisible.
- The only enforcement is feed hiding. The pages stay indexable with followed
  links, which is the whole payoff for SEO farming.
- The only state is the latest verdict on the row. There is no history, so we
  can't ask how often the classifier was overruled or what a rule change would
  have done.
- Review stops after five posts and is triggered only by the in-app publish
  path, not by appview-indexed records.

## Model

Five parts, each replaceable on its own.

```
triggers ──▶ signals ──▶ policy ──▶ standing ──▶ enforcement
                │           │           │
                └───────────┴───────────┴──▶ review_events (append-only log)
                                                   │
                                     admin queue · monitoring · replay
```

### 1. Subjects

A subject is `(kind, id)`:

| kind          | id              | role                                              |
| ------------- | --------------- | ------------------------------------------------- |
| `account`     | DID             | The unit of standing. Everything rolls up to it.  |
| `publication` | at-uri          | Can be judged apart from its owner (shared pubs). |
| `document`    | at-uri          | Single-item takedown without condemning an account. |
| `domain`      | registrable domain | A link target. Flagging one implicates every account linking to it. |

Effective standing for a document is the worst of its own, its publication's
and its author account's. `domain` is what makes ring-level action one click
instead of one per account.

### 2. Triggers

Anything that says "look at this subject again". All of them send one Inngest
event, `review/subject.touched { kind, id, cause }`, debounced per subject.

- `document.published` from `publishLeaflet` (with or without a publication)
- `document.indexed` from the appview upsert, so third-party clients are covered
- `publication.created`
- `signal.changed`: a signal on a related subject moved (a domain got flagged,
  so re-review everyone linking to it)
- `admin.requested`, `sweep` (cron over stale or never-reviewed subjects)
- later: `user.reported`

Re-review is driven by change, not by a post count. `RECHECK_POST_LIMIT` goes away.

### 3. Signals

A signal is a named, versioned function from a subject to an observation.

```ts
// src/review/signals/linkDomainConcentration.ts
export default defineSignal({
  id: "links.domain_concentration",
  version: 1,
  subject: "account",
  cost: "cheap",            // cheap signals always run; costly ones run when policy asks
  async compute(ctx) {
    // ...
    return { value: 0.92, evidence: { domains: ["cleartwo.co.uk"], docs: 18 } };
  },
});
```

- `value` is a number or enum the policy can compare. `evidence` is free-form
  JSON shown to the admin and fed to later signals.
- A registry (`src/review/signals/index.ts`) is a typed map, like
  `blockDispatch.ts`. Adding a signal is adding a file and one registry line.
- Every run writes a row to `review_events`, keyed by signal id and version, so
  a changed signal never silently rewrites history.
- `ctx` gives loaders (documents by author, profile, link facts, prior signal
  values) with per-run memoisation, so signals don't each re-query.

Starting set:

| id                            | cost   | what it sees                                                        |
| ----------------------------- | ------ | ------------------------------------------------------------------- |
| `account.age_and_graph`       | cheap  | account age, followers, profile record present                      |
| `publish.cadence`             | cheap  | documents per hour, burstiness                                      |
| `links.per_document`          | cheap  | outbound links vs text length, commercial-anchor ratio              |
| `links.domain_concentration`  | cheap  | share of documents pointing at the same few domains                 |
| `links.shared_domains`        | cheap  | other recent accounts linking to the same domains (ring detection)  |
| `links.flagged_domain`        | cheap  | links to a domain whose standing is `spam`                          |
| `promotion.external`          | cheap  | Bluesky accounts mentioning this author's documents, and their spread |
| `content.llm`                 | costly | today's classifier, given the cheap signals as context             |
| `history.prior_decisions`     | cheap  | this account's earlier standings and overrides                      |

The link signals need one fact table, filled at publish and index time by the
existing `collectContent` walk:

```sql
create table document_links (
  document text references documents(uri) on delete cascade,
  author_did text not null,
  domain text not null,       -- registrable domain
  url text not null,
  primary key (document, url)
);
create index on document_links (domain, author_did);
```

### 4. Policy

Policy turns signals into a decision. It is an ordered list of rules in code,
versioned as a whole (`POLICY_VERSION`), first match wins.

```ts
export const policy = definePolicy([
  rule("flagged-domain", { when: s => s["links.flagged_domain"] > 0, then: "spam" }),
  rule("link-ring", {
    when: s => s["links.shared_domains"] >= 3 && s["links.domain_concentration"] > 0.6,
    then: "hold", escalate: true,
  }),
  rule("needs-llm", { when: s => s["links.per_document"] > 0.5, run: ["content.llm"] }),
  rule("llm-spam",  { when: s => s["content.llm"] === "spam",  then: "spam",  mode: "shadow" }),
  rule("llm-legit", { when: s => s["content.llm"] === "legit", then: "clear" }),
  rule("default",   { then: "pending" }),
]);
```

- `run` asks for costly signals and re-evaluates. This is the workflow: cheap
  gate, then LLM, then decision. A new workflow is a new rule.
- `mode: "shadow"` records what the rule would have done without acting.
  This replaces the global `PUBLICATION_REVIEW_AUTO_ACTION` flag with a
  per-rule switch, so each rule earns auto-action on its own record.
- `escalate` puts the subject in the human queue with the matched rule and
  evidence attached.
- A human decision is always final and outranks policy until an admin reopens it.

### 5. Standing and enforcement

Standing is the current answer; enforcement reads only standing.

```sql
create table review_subjects (
  kind text not null, id text not null,
  status text not null default 'pending',   -- pending | cleared | held | spam
  decided_by text,                          -- 'policy:<rule>@<version>' | identity uuid
  decided_at timestamptz,
  needs_human boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
create index on review_subjects (updated_at desc) where needs_human;
```

One lookup, `getStanding(docs)`, resolves the worst standing across document,
publication and author. One table maps status to what a subject may do:

| status    | discovery feeds | search indexing | followed links | page served |
| --------- | --------------- | --------------- | -------------- | ----------- |
| `cleared` | yes             | yes             | yes            | yes         |
| `pending` | no              | no (`noindex`)  | no (`nofollow ugc`) | yes    |
| `held`    | no              | no              | no             | yes         |
| `spam`    | no              | no              | no             | owner only  |

Surfaces call capability checks (`canDiscover`, `canIndex`, `followLinks`),
never statuses. Today's `dropHeld` call sites become `canDiscover`; the `/p/`
and `/lish/` pages, sitemaps and `TextBlockCore`'s `ugcLinks` read the other
two. A new enforcement is a new column in this table plus its call site.

Subjects with no row (everything before launch) are treated as `cleared`, as
`dropHeld` does now. A failed lookup also fails open for feeds.

### The log

```sql
create table review_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null, subject_id text not null,
  type text not null,        -- signal | decision | shadow_decision | human | enforcement
  name text,                 -- signal id or rule id
  version int,
  value jsonb, evidence jsonb,
  actor text                 -- 'system' or identity uuid
);
create index on review_events (kind, subject_id, at desc);
create index on review_events (type, name, at desc);
```

Append-only. `review_subjects` is a projection of it. Human decisions in the
log are the labelled set everything else is measured against.

### As built (2026-11-24)

Statuses are `cleared`, `needs_review` and `spam`: what to do with an account.
Why is separate: `src/review/reasons.ts` works out every reason that applies
from the signals, independent of which rule matched, and stores the list on
`review_subjects.reasons` (code, sentence, and the site or account it is
about). The admin queue filters by reason and block-by-site selects by it.
`npm run review-backfill -- --sink=… --replay` re-decides every account from
logged signal values after a rule or reason changes, at no signal cost.

The policy runs in dry-run: `review_subjects.proposed_status` is advice and
nothing reads it. The one enforced state is `enforced_status = 'spam'`, set by
an admin's block from `/admin/review` (one account, or every flagged account
devoted to a site). `src/review/blocked.ts` is the only reader, and it is
checked at publish, at appview indexing, in the post, publication and profile
page loaders, and in `dropHeld` for the feeds. The capability table above is
still the target; today there is one capability, blocked or not.

## Monitoring

All of it is queries over `review_events`, shown at `/admin/review`.

- **Queue**: subjects with `needs_human`, with matched rule, signal values and
  evidence inline. Same row actions as today's queue, plus "flag domain".
- **Clusters**: domains ranked by distinct recent accounts linking to them.
  This view alone would have surfaced the ring on day one.
- **Health over time** (XmR charts, as in the active-users dashboard): subjects
  reviewed per day, decisions by rule, queue size and age, LLM spend.
- **Quality**: per rule and per signal, agreement with human decisions:
  precision, recall, and override rate. Shadow rules show the same numbers
  before they act. A rule graduates out of shadow when its override rate is
  low enough over enough labels.
- **Replay**: a script that re-runs a policy or signal version over logged
  signal values (or recomputes them) for labelled subjects and prints the
  confusion matrix and the list of flips. Run before merging any policy
  change. Known cases, starting with the m-oazzam ring, live as fixtures and
  run in vitest.
- **Alerts**: queue age over a threshold, a domain crossing N new accounts in
  a day, override rate jumping after a policy version change.

## Layout

```
src/review/
  subjects.ts        kinds, roll-up, getStanding, capabilities
  signals/           one file per signal + index.ts registry
  policy.ts          rules, POLICY_VERSION
  run.ts             load ctx → cheap signals → policy → costly signals → decide → log
  log.ts             review_events writers and readers
  touch.ts           requestReview(kind, id, cause)
app/api/inngest/functions/review_subject.ts
app/(app)/(identity)/admin/review/      queue, clusters, health
scripts/review-replay.ts
```

## Phasing

1. **Foundation**: `review_subjects`, `review_events`, `document_links`;
   `run.ts` with `content.llm` ported as the only costly signal; account
   subjects; triggers from publish and appview. Migrate `publication_reviews`
   rows and replace `dropHeld` with `canDiscover`. Behaviour matches today
   plus standalone documents.
2. **Incentive removal**: `canIndex` and `followLinks` on post pages and
   sitemaps. Ships independently of classifier quality.
3. **Ring signals**: the `links.*` signals, `domain` subjects, cluster view.
   All new rules start in shadow.
4. **Measurement**: health and quality views, replay script, ring fixtures.
   Graduate rules out of shadow on their numbers.
5. **Later**: user reports, `promotion.external`, alerts.

## Decisions for the owner

- **Default for new accounts.** Recommended: `pending` (out of discovery,
  `noindex`, `nofollow`) until policy clears them, with cheap-signal auto-clear
  so real writers wait minutes. The alternative, visible until flagged, keeps
  the SEO payoff alive for as long as review takes.
- **`nofollow` for everyone or only uncleared.** Recommended: only uncleared.
  Cleared writers keep normal links, and the difference is a reason to be cleared.
- **What `spam` does to the page.** Recommended: owner-only, since the record
  still lives on their PDS. A 410 for everyone else.
- **Backfill.** Recommended: run phase 3 signals over all existing accounts in
  shadow, review the top clusters by hand, then enable.
