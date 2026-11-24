import Link from "next/link";
import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminIdentity } from "src/adminAllowlist";
import { pool } from "supabase/pool";
import { POLICY_VERSION, REVIEW_MODE } from "src/review/policy";
import { BlockAccountButton, BlockSiteButton } from "./BlockButtons";

export const metadata = {
  title: "Review System",
};

const QUEUE_SIZE = 150;

// The newest value of each signal for each subject.
const LATEST_SIGNALS = `
  select distinct on (subject_id, name) subject_id, name, value, evidence
  from review_events
  where kind = 'account' and type = 'signal'
  order by subject_id, name, at desc`;

type RuleRow = {
  proposed_status: string;
  proposed_by: string | null;
  accounts: number;
  documents: number;
  publications: number;
};
type LabelRow = {
  human_label: string;
  proposed_status: string;
  proposed_by: string | null;
  accounts: number;
};
type MonthRow = {
  month: string;
  cleared: number;
  pending: number;
  held: number;
  spam: number;
};
type ClusterRow = {
  domain: string;
  accounts: number;
  documents: number;
  spam: number;
  held: number;
  labelled: number;
  blocked: number;
  example: string | null;
};
type DayRow = { day: string; run: string; status: string; accounts: number };
type QueueRow = {
  id: string;
  label: {
    handle?: string | null;
    publications?: { name: string; url: string | null }[];
  };
  stats: { documents?: number; standalone?: number; publications?: number };
  first_seen: string | null;
  proposed_status: string;
  proposed_by: string | null;
  needs_human: boolean;
  human_label: string | null;
  blocked: boolean;
  signals: Record<string, { value: unknown; evidence: unknown }> | null;
};

async function rows<T>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}

function Section(props: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3>{props.title}</h3>
      {props.note && (
        <div className="text-sm text-tertiary leading-snug">{props.note}</div>
      )}
      {props.children}
    </div>
  );
}

function Table(props: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-tertiary">
            {props.head.map((h, i) => (
              <th key={h} className={`font-normal py-1 ${i > 0 ? "pl-3" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{props.children}</tbody>
      </table>
    </div>
  );
}

const cell = "py-1 pl-3 tabular-nums";
const num = (n: number) => n.toLocaleString("en-US");

export default async function ReviewSystemPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminIdentity(identity?.id)) notFound();

  let [byRule, labels, months, clusters, days, queue] = await Promise.all([
    rows<RuleRow>(
      `select proposed_status, proposed_by, count(*)::int as accounts,
         coalesce(sum((stats->>'documents')::int), 0)::int as documents,
         coalesce(sum((stats->>'publications')::int), 0)::int as publications
       from review_subjects where kind = 'account'
       group by 1, 2 order by 3 desc`,
    ),
    rows<LabelRow>(
      `select human_label, proposed_status, proposed_by, count(*)::int as accounts
       from review_subjects where kind = 'account' and human_label is not null
       group by 1, 2, 3 order by 1, 4 desc`,
    ),
    rows<MonthRow>(
      `select to_char(date_trunc('month', first_seen), 'YYYY-MM') as month,
         count(*) filter (where proposed_status = 'cleared')::int as cleared,
         count(*) filter (where proposed_status = 'pending')::int as pending,
         count(*) filter (where proposed_status = 'held')::int as held,
         count(*) filter (where proposed_status = 'spam')::int as spam
       from review_subjects
       where kind = 'account' and first_seen > now() - interval '12 months'
       group by 1 order by 1 desc`,
    ),
    rows<ClusterRow>(
      `with latest as (${LATEST_SIGNALS})
       select l.evidence->>'domain' as domain, count(*)::int as accounts,
         coalesce(sum((s.stats->>'documents')::int), 0)::int as documents,
         count(*) filter (where s.proposed_status = 'spam')::int as spam,
         count(*) filter (where s.proposed_status = 'held')::int as held,
         count(*) filter (where s.human_label = 'spam')::int as labelled,
         count(*) filter (where s.enforced_status = 'spam')::int as blocked,
         min(s.label->>'handle') as example
       from latest l
       join review_subjects s on s.kind = 'account' and s.id = l.subject_id
       where l.name = 'links.farm_accounts' and (l.value #>> '{}')::int > 0
       group by 1 order by 2 desc, 1 limit 40`,
    ),
    rows<DayRow>(
      `select to_char(date_trunc('day', at), 'YYYY-MM-DD') as day, run,
         value #>> '{}' as status, count(*)::int as accounts
       from review_events
       where type = 'decision' and at > now() - interval '30 days'
       group by 1, 2, 3 order by 1 desc, 2 desc, 4 desc limit 60`,
    ),
    rows<QueueRow>(
      `with latest as (${LATEST_SIGNALS})
       select s.id, s.label, s.stats,
         to_char(s.first_seen, 'YYYY-MM-DD') as first_seen, s.proposed_status,
         s.proposed_by, s.needs_human, s.human_label,
         s.enforced_status is not null as blocked,
         (select jsonb_object_agg(l.name,
            jsonb_build_object('value', l.value, 'evidence', l.evidence))
          from latest l where l.subject_id = s.id) as signals
       from review_subjects s
       where s.kind = 'account' and (s.needs_human
         or s.proposed_status = 'spam' or s.enforced_status is not null)
       order by s.enforced_status is not null, s.needs_human desc,
         s.first_seen desc nulls last
       limit $1`,
      [QUEUE_SIZE],
    ),
  ]);

  let total = byRule.reduce((n, r) => n + r.accounts, 0);
  let totalDocs = byRule.reduce((n, r) => n + r.documents, 0);
  let monthMax = Math.max(
    1,
    ...months.map((m) => m.cleared + m.pending + m.held + m.spam),
  );

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-baseline gap-4">
          <h2>Review system</h2>
          <Link
            href="/admin/publications"
            className="text-sm text-accent-contrast hover:underline"
          >
            Publication queue →
          </Link>
        </div>
        <div className="text-secondary leading-snug">
          {REVIEW_MODE === "dry-run"
            ? "Dry run: the proposals below change nothing for readers or search engines. Only a block does: a blocked account can't publish, isn't indexed, and its pages return 404."
            : "Live: proposals below are enforced."}{" "}
          Policy v{POLICY_VERSION}. {num(total)} accounts with {num(totalDocs)}{" "}
          documents reviewed.
        </div>
      </div>

      <Section
        title="What the policy would do"
        note="Each account lands on the first rule it matches. content-check means the account needs the content.llm signal, which has not been run for it. Proposals are advice; blocking is done by hand below."
      >
        <Table
          head={[
            "Proposal",
            "Rule",
            "Accounts",
            "Share",
            "Documents",
            "Publications",
          ]}
        >
          {byRule.map((r) => (
            <tr
              key={`${r.proposed_status}/${r.proposed_by}`}
              className="border-t border-border-light"
            >
              <td className="py-1 font-bold">{r.proposed_status}</td>
              <td className={cell}>{r.proposed_by ?? "not judged"}</td>
              <td className={cell}>{num(r.accounts)}</td>
              <td className={cell}>
                {total ? ((100 * r.accounts) / total).toFixed(1) : 0}%
              </td>
              <td className={cell}>{num(r.documents)}</td>
              <td className={cell}>{num(r.publications)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Against admin decisions"
        note="Accounts an admin already judged in the publication queue, and what the policy proposes for them. A spam label that ends up cleared, or a legit label that ends up spam, is a miss."
      >
        {labels.length === 0 ? (
          <div className="text-sm text-tertiary">No labelled accounts.</div>
        ) : (
          <Table head={["Admin said", "Policy proposes", "Rule", "Accounts"]}>
            {labels.map((r) => (
              <tr
                key={`${r.human_label}/${r.proposed_status}/${r.proposed_by}`}
                className="border-t border-border-light"
              >
                <td className="py-1 font-bold">{r.human_label}</td>
                <td className={cell}>{r.proposed_status}</td>
                <td className={cell}>{r.proposed_by}</td>
                <td className={cell}>{num(r.accounts)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section
        title="Accounts by month of first post"
        note="When the accounts behind each proposal first published."
      >
        <Table head={["Month", "", "Cleared", "Pending", "Held", "Spam"]}>
          {months.map((m) => {
            let sum = m.cleared + m.pending + m.held + m.spam;
            let flagged = m.held + m.spam;
            return (
              <tr key={m.month} className="border-t border-border-light">
                <td className="py-1 tabular-nums">{m.month}</td>
                <td className="py-1 pl-3 w-1/2">
                  <div className="flex h-3 w-full">
                    <div
                      className="bg-accent-contrast"
                      style={{ width: `${(100 * flagged) / monthMax}%` }}
                    />
                    <div
                      className="bg-border"
                      style={{
                        width: `${(100 * (sum - flagged)) / monthMax}%`,
                      }}
                    />
                  </div>
                </td>
                <td className={cell}>{num(m.cleared)}</td>
                <td className={cell}>{num(m.pending)}</td>
                <td className={cell}>{num(m.held)}</td>
                <td className={cell}>{num(m.spam)}</td>
              </tr>
            );
          })}
        </Table>
      </Section>

      <Section
        title="Link clusters"
        note="Sites that several throwaway accounts are each devoted to. One row is one operator's footprint."
      >
        <Table
          head={[
            "Site",
            "Accounts",
            "Documents",
            "Proposed spam",
            "Held",
            "Admin-labelled spam",
            "Blocked",
            "Example",
            "",
          ]}
        >
          {clusters.map((c) => (
            <tr key={c.domain} className="border-t border-border-light">
              <td className="py-1 font-bold">{c.domain}</td>
              <td className={cell}>{num(c.accounts)}</td>
              <td className={cell}>{num(c.documents)}</td>
              <td className={cell}>{num(c.spam)}</td>
              <td className={cell}>{num(c.held)}</td>
              <td className={cell}>{num(c.labelled)}</td>
              <td className={cell}>{num(c.blocked)}</td>
              <td className={`${cell} text-tertiary`}>{c.example}</td>
              <td className="py-1 pl-3">
                {c.spam + c.held > c.blocked && (
                  <BlockSiteButton
                    domain={c.domain}
                    accounts={c.spam + c.held - c.blocked}
                  />
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Decisions over time"
        note="Decisions recorded per day and run, over the last 30 days."
      >
        <Table head={["Day", "Run", "Proposal", "Accounts"]}>
          {days.map((d) => (
            <tr
              key={`${d.day}/${d.run}/${d.status}`}
              className="border-t border-border-light"
            >
              <td className="py-1 tabular-nums">{d.day}</td>
              <td className={`${cell} text-tertiary`}>{d.run}</td>
              <td className={cell}>{d.status}</td>
              <td className={cell}>{num(d.accounts)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Flagged accounts"
        note={`Accounts proposed as spam or waiting on a person, newest first (up to ${QUEUE_SIZE}). Open a row for the signal values and evidence behind it.`}
      >
        <div className="flex flex-col gap-2">
          {queue.map((q) => (
            <details
              key={q.id}
              className="border border-border-light rounded-md px-3 py-2"
            >
              <summary className="cursor-pointer flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                <span className="font-bold">{q.label.handle ?? q.id}</span>
                <span className="text-sm">
                  {q.proposed_status} · {q.proposed_by}
                </span>
                <span className="text-sm text-tertiary">
                  {q.stats.documents ?? 0} documents
                  {q.stats.standalone
                    ? ` (${q.stats.standalone} standalone)`
                    : ""}
                  {q.first_seen ? ` · since ${q.first_seen}` : ""}
                  {q.human_label ? ` · admin said ${q.human_label}` : ""}
                </span>
                {q.blocked && (
                  <span className="text-sm font-bold">blocked</span>
                )}
              </summary>
              <div className="flex flex-col gap-2 pt-2 text-sm">
                <div className="self-start">
                  <BlockAccountButton did={q.id} blocked={q.blocked} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`/p/${q.id}`}
                    target="_blank"
                    className="text-accent-contrast hover:underline"
                  >
                    Leaflet profile
                  </a>
                  <a
                    href={`https://bsky.app/profile/${q.id}`}
                    target="_blank"
                    className="text-accent-contrast hover:underline"
                  >
                    Bluesky
                  </a>
                  {(q.label.publications ?? []).map((p) =>
                    p.url ? (
                      <a
                        key={p.url}
                        href={p.url}
                        target="_blank"
                        className="text-accent-contrast hover:underline"
                      >
                        {p.name}
                      </a>
                    ) : (
                      <span key={p.name}>{p.name}</span>
                    ),
                  )}
                </div>
                {Object.entries(q.signals ?? {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([name, s]) => (
                    <div key={name} className="flex flex-col">
                      <div>
                        <span className="text-tertiary">{name}</span>{" "}
                        <span className="font-bold">
                          {JSON.stringify(s.value)}
                        </span>
                      </div>
                      {s.evidence != null && (
                        <div className="text-xs text-tertiary break-all">
                          {JSON.stringify(s.evidence)}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </details>
          ))}
        </div>
      </Section>
    </div>
  );
}
