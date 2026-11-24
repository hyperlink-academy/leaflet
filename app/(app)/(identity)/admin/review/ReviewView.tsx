import Link from "next/link";
import type {
  Account,
  Cluster,
  Health,
  Post,
  ReviewData,
  View,
  Week,
} from "./data";
import { BlockAccountButton, BlockSiteButton } from "./BlockButtons";
import { QueueKeys } from "./QueueKeys";

const CLUSTERS_SHOWN = 8;

const num = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many = `${one}s`) =>
  `${num(n)} ${n === 1 ? one : many}`;
const percent = (part: number, whole: number) =>
  whole ? `${Math.round((100 * part) / whole)}%` : "0%";

const link = "text-accent-contrast hover:underline";
const cell = "py-1 pl-3 tabular-nums text-right whitespace-nowrap";

const STATUS: Record<string, string> = {
  cleared: "Cleared",
  pending: "Unsure",
  held: "Held",
  spam: "Proposed spam",
};

// Plain-words versions of the rules in src/review/policy.ts, keyed by rule id.
const RULES: Record<string, string> = {
  "known-spam-site":
    "Devoted to a site that accounts an admin marked as spam are devoted to.",
  "link-farm":
    "Empty account in a link farm: five or more other throwaway accounts are devoted to the same site.",
  "link-farm-small":
    "Possible small link farm: a few other throwaway accounts are devoted to the same site.",
  "link-ring":
    "Possible link ring: an empty account whose posts each carry one backlink, sharing several uncommon link targets with another account.",
  "established-author": "Established Bluesky account with ordinary links.",
  "content-check": "Waiting for the model to read its posts.",
  "llm-spam": "The model read its posts and judged them spam.",
  "llm-legit": "The model read its posts and judged them legitimate.",
  "llm-unsure": "The model read its posts and couldn't tell.",
};

function ExternalLink(props: {
  href: string;
  children: React.ReactNode;
  className?: string;
  profile?: boolean;
}) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noreferrer"
      className={props.className ?? link}
      data-review-profile={props.profile ? "" : undefined}
    >
      {props.children}
    </a>
  );
}

function PostLine(props: { did: string; post: Post; site?: string | null }) {
  let { post, site } = props;
  // One link stands for the post: on the site in question when there is one,
  // and the longest, since that is the one most likely to name the product.
  let shown = [...post.links]
    .sort(
      (a, b) =>
        Number(!!site && b.includes(site)) -
          Number(!!site && a.includes(site)) || b.length - a.length,
    )[0]
    ?.replace(/^https?:\/\/(www\.)?/, "");
  return (
    <>
      <ExternalLink href={`/p/${props.did}/${post.rkey}`}>
        {post.title?.trim() || "Untitled post"}
      </ExternalLink>
      <span className="text-tertiary">
        {shown
          ? ` → ${shown}${post.links.length > 1 ? ` and ${plural(post.links.length - 1, "more link")}` : ""}`
          : " · no links"}
      </span>
    </>
  );
}

function Tile(props: { href: string; big: string; small: string }) {
  return (
    <a
      href={props.href}
      className="flex flex-col border border-border-light rounded-md px-3 py-2 leading-snug hover:border-accent-contrast"
    >
      <span className="text-xl font-bold tabular-nums">{props.big}</span>
      <span className="text-sm text-secondary">{props.small}</span>
    </a>
  );
}

function Trend(props: { weeks: Week[] }) {
  let max = Math.max(1, ...props.weeks.map((w) => w.total));
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-tertiary">
          <th className="font-normal text-left py-1">Week of</th>
          <th />
          <th className={`font-normal ${cell}`}>New accounts</th>
          <th className={`font-normal ${cell}`}>Spam or held</th>
        </tr>
      </thead>
      <tbody>
        {props.weeks.map((w) => {
          let flagged = w.spam + w.held;
          return (
            <tr key={w.week} className="border-t border-border-light">
              <td className="py-1 whitespace-nowrap">
                {w.week}
                {w.current && <span className="text-tertiary"> so far</span>}
              </td>
              <td className="py-1 pl-3 w-1/2">
                <div className="flex h-3 w-full">
                  <div
                    className="bg-accent-contrast"
                    style={{ width: `${(100 * flagged) / max}%` }}
                  />
                  <div
                    className="bg-border"
                    style={{ width: `${(100 * (w.total - flagged)) / max}%` }}
                  />
                </div>
              </td>
              <td className={cell}>{num(w.total)}</td>
              <td
                className={`${cell} ${2 * flagged > w.total ? "font-bold" : ""}`}
              >
                {num(flagged)} ({percent(flagged, w.total)})
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ClusterCard(props: { cluster: Cluster }) {
  let c = props.cluster;
  return (
    <div className="flex flex-col gap-1 border border-border-light rounded-md px-3 py-2 text-sm leading-snug">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="text-base font-bold break-all">{c.domain}</div>
          <div className="text-secondary">
            {plural(c.accounts, "account")} · {plural(c.documents, "post")} ·{" "}
            {c.firstSeen === c.lastSeen
              ? `joined ${c.firstSeen}`
              : `joined ${c.firstSeen} to ${c.lastSeen}`}
            {c.thisWeek > 0 && (
              <span className="font-bold">
                {" "}
                · {num(c.thisWeek)} new in the last 7 days
              </span>
            )}
            {c.alreadyBlocked > 0 &&
              ` · ${num(c.alreadyBlocked)} more already blocked`}
          </div>
        </div>
        <div className="shrink-0 max-w-[60%]">
          <BlockSiteButton domain={c.domain} accounts={c.accounts} />
        </div>
      </div>
      {c.examples.map((e) => (
        <div key={e.id} className="truncate">
          <ExternalLink href={`/p/${e.id}`} className="hover:underline">
            {e.handle ?? e.id}
          </ExternalLink>
          {e.post && (
            <>
              <span className="text-tertiary"> posted </span>
              <PostLine did={e.id} post={e.post} site={c.domain} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

type Evidence = {
  domain: string | null;
  partners: { did: string; shared: number; domains: string[] }[];
  documents: number;
  singleTarget: number;
  targets: { domain: string; documents: number }[];
  hourStarting: string | null;
  followers: number;
  posts: number;
  ageDays: number | null;
  hasBio: boolean;
  category: string;
  reason: string;
};

function signal(account: Account, name: string) {
  let s = account.signals[name];
  return {
    value: s?.value,
    count: typeof s?.value === "number" ? s.value : 0,
    evidence: (s?.evidence ?? {}) as Partial<Evidence>,
  };
}

// What the signals in src/review/signals/ found, as sentences.
function findings(account: Account, handles: Record<string, string>) {
  let out: React.ReactNode[] = [];
  let farm = signal(account, "links.farm_accounts");
  let known = signal(account, "links.spam_domains");
  let single = signal(account, "links.single_target_share");
  let shared = signal(account, "links.shared_domains");
  let burst = signal(account, "publish.burst");
  let profile = signal(account, "account.profile");

  if (farm.evidence.domain)
    out.push(
      <>
        At least half its posts link to <b>{farm.evidence.domain}</b>
        {farm.count > 0
          ? `, and ${plural(farm.count, "other throwaway account")} ${farm.count === 1 ? "does" : "do"} the same.`
          : "; no other throwaway account does the same."}
      </>,
    );
  if (known.count > 0)
    out.push(
      `${plural(known.count, "account")} devoted to ${known.evidence.domain} ${known.count === 1 ? "was" : "were"} marked as spam by an admin.`,
    );
  if (single.evidence.singleTarget && single.evidence.documents) {
    let targets = (single.evidence.targets ?? [])
      .slice(0, 4)
      .map((t) => `${t.domain} (${t.documents})`);
    out.push(
      `${num(single.evidence.singleTarget)} of ${plural(single.evidence.documents, "post")} link to exactly one site: ${targets.join(", ")}${(single.evidence.targets ?? []).length > 4 ? " and others" : ""}.`,
    );
  }
  let partner = shared.evidence.partners?.[0];
  if (partner && partner.shared >= 2)
    out.push(
      <>
        Shares {partner.shared} uncommon link targets with{" "}
        <ExternalLink href={`/p/${partner.did}`}>
          {handles[partner.did] ?? "another account"}
        </ExternalLink>
        : {partner.domains.slice(0, 4).join(", ")}
        {partner.domains.length > 4 && " and others"}.
      </>,
    );
  if (burst.count >= 3)
    out.push(
      `Published ${burst.count} posts within one hour${burst.evidence.hourStarting ? ` on ${burst.evidence.hourStarting.slice(0, 10)}` : ""}.`,
    );
  if (typeof profile.value === "string") {
    let p = profile.evidence;
    out.push(
      `Bluesky account looks ${profile.value}: ${plural(p.followers ?? 0, "follower")}, ${plural(p.posts ?? 0, "Bluesky post")}, ${p.ageDays == null ? "age unknown" : `${plural(p.ageDays, "day")} old`}, ${p.hasBio ? "has a bio" : "no bio"}.`,
    );
  } else out.push("Its Bluesky profile could not be loaded.");
  return out;
}

function AccountCard(props: {
  account: Account;
  handles: Record<string, string>;
}) {
  let a = props.account;
  let name = a.label.handle ?? a.id;
  let documents = a.stats.documents ?? 0;
  let model = signal(a, "content.llm");
  let site = signal(a, "links.farm_accounts").evidence.domain;
  return (
    <div
      data-review-account
      tabIndex={-1}
      className="flex flex-col gap-2 border border-border-light rounded-md px-3 py-2 text-sm leading-snug scroll-mt-4 outline-none focus-within:border-accent-contrast"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-bold break-all">{name}</span>
            {a.label.displayName && (
              <span className="text-secondary">{a.label.displayName}</span>
            )}
          </div>
          <div className="text-tertiary">
            {STATUS[a.proposedStatus] ?? a.proposedStatus} ·{" "}
            {plural(documents, "post")}
            {a.firstSeen && ` · first posted ${a.firstSeen}`}
            {a.blockedOn && ` · blocked ${a.blockedOn}`}
            {a.humanLabel &&
              ` · marked ${a.humanLabel} in the publication queue`}
          </div>
        </div>
        <BlockAccountButton did={a.id} name={name} blocked={a.blocked} />
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="font-bold">
          {(a.proposedBy && RULES[a.proposedBy]) ??
            a.proposedBy ??
            "Not judged yet."}
        </div>
        {typeof model.value === "string" && model.evidence.reason && (
          <div className="text-secondary">
            Model says {model.value}
            {model.evidence.category &&
              model.evidence.category !== "none" &&
              ` (${model.evidence.category.replaceAll("_", " ")})`}
            : {model.evidence.reason}
          </div>
        )}
        <ul className="list-disc pl-5 text-secondary">
          {findings(a, props.handles).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>

      {a.posts.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="text-tertiary">
            {documents > a.posts.length
              ? `Newest ${a.posts.length} of ${num(documents)} posts`
              : "Posts"}
          </div>
          {a.posts.map((p) => (
            <div key={p.rkey} className="truncate">
              <PostLine did={a.id} post={p} site={site} />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <ExternalLink href={`/p/${a.id}`} profile>
          Leaflet profile
        </ExternalLink>
        <ExternalLink href={`https://bsky.app/profile/${a.id}`}>
          Bluesky
        </ExternalLink>
        {(a.label.publications ?? []).map((p) =>
          p.url ? (
            <ExternalLink key={p.url} href={p.url}>
              {p.name}
            </ExternalLink>
          ) : (
            <span key={p.name} className="text-tertiary">
              {p.name}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function HealthTable(props: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-tertiary">
            {props.head.map((h, i) => (
              <th
                key={h}
                className={`font-normal py-1 ${i === 0 ? "text-left" : "pl-3 text-right"}`}
              >
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

function PolicyHealth(props: { health: Health; accounts: number }) {
  let { byRule, labels, misses, days } = props.health;
  let agreement = ["spam", "legit"].flatMap((label) => {
    let rows = labels.filter((l) => l.label === label);
    let total = rows.reduce((n, r) => n + r.accounts, 0);
    if (total === 0) return [];
    let parts = rows.map(
      (r) =>
        `${num(r.accounts)} ${(STATUS[r.status] ?? r.status).toLowerCase()}`,
    );
    return [
      `Of ${plural(total, "account")} an admin marked ${label}, the policy has ${parts.join(", ")}.`,
    ];
  });
  return (
    <div className="flex flex-col gap-6 pt-3">
      <div className="flex flex-col gap-1 text-sm">
        <h4>Against past admin decisions</h4>
        {agreement.length === 0 ? (
          <div className="text-tertiary">No admin-labelled accounts yet.</div>
        ) : (
          agreement.map((a) => <div key={a}>{a}</div>)
        )}
        {misses.length > 0 && (
          <div className="text-secondary">
            Disagreements:{" "}
            {misses.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ", "}
                <ExternalLink href={`/p/${m.id}`}>
                  {m.handle ?? m.id}
                </ExternalLink>{" "}
                (marked {m.label}, {m.rule})
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h4>What each rule proposes</h4>
        <HealthTable head={["Rule", "Proposal", "Accounts", "Share"]}>
          {byRule.map((r) => (
            <tr
              key={`${r.status}/${r.rule}`}
              className="border-t border-border-light align-top"
            >
              <td className="py-1">
                {r.rule ?? "not judged"}
                {r.rule && RULES[r.rule] && (
                  <div className="text-tertiary">{RULES[r.rule]}</div>
                )}
              </td>
              <td className={cell}>{STATUS[r.status] ?? r.status}</td>
              <td className={cell}>{num(r.accounts)}</td>
              <td className={cell}>{percent(r.accounts, props.accounts)}</td>
            </tr>
          ))}
        </HealthTable>
      </div>

      <div className="flex flex-col gap-1">
        <h4>Per day, last 30 days</h4>
        <HealthTable
          head={[
            "Day",
            "Cleared",
            "Unsure",
            "Held",
            "Proposed spam",
            "Blocked",
            "Unblocked",
          ]}
        >
          {days.map((d) => (
            <tr key={d.day} className="border-t border-border-light">
              <td className="py-1 tabular-nums">{d.day}</td>
              <td className={cell}>{num(d.cleared)}</td>
              <td className={cell}>{num(d.pending)}</td>
              <td className={cell}>{num(d.held)}</td>
              <td className={cell}>{num(d.spam)}</td>
              <td className={cell}>{num(d.blocks)}</td>
              <td className={cell}>{num(d.unblocks)}</td>
            </tr>
          ))}
        </HealthTable>
      </div>
    </div>
  );
}

const VIEW_HELP: Record<View, string> = {
  review:
    "The policy couldn't decide these. Held accounts first, then the ones the model was unsure about, newest first.",
  spam: "Proposed as spam and not blocked. Most belong to a link farm above.",
  blocked: "Blocked accounts, most recent first.",
};

export function ReviewView(props: {
  data: ReviewData;
  policyVersion: number;
  dryRun: boolean;
}) {
  let d = props.data;
  let thisWeek = d.weeks.find((w) => w.current);
  let farmAccounts = d.clusters.reduce((n, c) => n + c.accounts, 0);
  let smaller = d.clusters.slice(CLUSTERS_SHOWN);

  let href = (o: { view?: View; page?: number }) => {
    let params = new URLSearchParams();
    let view = o.view ?? d.view;
    if (view !== "review") params.set("view", view);
    if (d.search && !o.view) params.set("q", d.search);
    if (o.page && o.page > 1) params.set("page", String(o.page));
    let query = params.toString();
    return `/admin/review${query ? `?${query}` : ""}#accounts`;
  };
  let tabs: [View, string, number][] = [
    ["review", "Needs a person", d.summary.review],
    ["spam", "Proposed spam", d.summary.spam],
    ["blocked", "Blocked", d.summary.blocked],
  ];

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline gap-4">
            <h2>Spam review</h2>
            <Link href="/admin/publications" className={`text-sm ${link}`}>
              Publication queue →
            </Link>
          </div>
          <div className="text-sm text-secondary leading-snug">
            {props.dryRun
              ? "The policy only proposes. Nothing happens to an account until you block it: then it can't publish, isn't indexed, and its pages 404."
              : "Live: the policy's proposals are enforced."}{" "}
            <span className="text-tertiary">
              Policy v{props.policyVersion} · {num(d.summary.accounts)} accounts
              {d.summary.lastRun && ` · last run ${d.summary.lastRun} UTC`}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Tile
            href="#trend"
            big={
              thisWeek
                ? `${num(thisWeek.spam + thisWeek.held)} of ${num(thisWeek.total)}`
                : "0"
            }
            small="new accounts this week flagged as spam"
          />
          <Tile
            href="#farms"
            big={num(farmAccounts)}
            small={`accounts in ${plural(d.clusters.length, "link farm")} to block`}
          />
          <Tile
            href="#accounts"
            big={num(d.summary.review)}
            small="accounts need a person"
          />
        </div>
      </div>

      <div id="trend" className="flex flex-col gap-2 scroll-mt-4">
        <h3>New accounts by week</h3>
        <Trend weeks={d.weeks} />
      </div>

      <div id="farms" className="flex flex-col gap-2 scroll-mt-4">
        <h3>Link farms</h3>
        <div className="text-sm text-tertiary leading-snug">
          Sites that several flagged accounts each exist to link to. One block
          takes down every flagged account devoted to the site.
        </div>
        {d.clusters.length === 0 && (
          <div className="text-sm text-tertiary">No unblocked link farms.</div>
        )}
        {d.clusters.slice(0, CLUSTERS_SHOWN).map((c) => (
          <ClusterCard key={c.domain} cluster={c} />
        ))}
        {smaller.length > 0 && (
          <details>
            <summary className={`cursor-pointer text-sm ${link}`}>
              {plural(smaller.length, "smaller farm")} with{" "}
              {plural(
                smaller.reduce((n, c) => n + c.accounts, 0),
                "account",
              )}
            </summary>
            <div className="flex flex-col gap-2 pt-2">
              {smaller.map((c) => (
                <ClusterCard key={c.domain} cluster={c} />
              ))}
            </div>
          </details>
        )}
      </div>

      <div id="accounts" className="flex flex-col gap-2 scroll-mt-4">
        <h3>Accounts</h3>
        <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {tabs.map(([view, label, count]) =>
              view === d.view && !d.search ? (
                <span key={view} className="font-bold">
                  {label} ({num(count)})
                </span>
              ) : (
                <Link key={view} href={href({ view })} className={link}>
                  {label} ({num(count)})
                </Link>
              ),
            )}
          </div>
          <form action="/admin/review#accounts" className="flex gap-2">
            <input
              name="q"
              defaultValue={d.search}
              placeholder="Find any account by handle"
              aria-label="Find any account by handle or DID"
              className="input-with-border w-56"
            />
          </form>
        </div>
        <div className="text-sm text-tertiary leading-snug">
          {d.search
            ? `${plural(d.matching, "account")} matching “${d.search}”, whatever the policy proposed.`
            : VIEW_HELP[d.view]}
        </div>
        <QueueKeys />
        {d.accounts.length === 0 && (
          <div className="text-sm text-tertiary">Nothing here.</div>
        )}
        {d.accounts.map((a) => (
          <AccountCard key={a.id} account={a} handles={d.handles} />
        ))}
        {d.pages > 1 && (
          <div className="flex justify-between items-baseline text-sm">
            {d.page > 1 ? (
              <Link href={href({ page: d.page - 1 })} className={link}>
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-tertiary">
              Page {d.page} of {d.pages}
            </span>
            {d.page < d.pages ? (
              <Link
                href={href({ page: d.page + 1 })}
                className={link}
                data-review-next-page
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>

      <details>
        <summary className="cursor-pointer">
          <h3 className="inline">Policy health</h3>
          <span className="text-sm text-tertiary">
            {" "}
            how the rules split accounts and agree with past decisions
          </span>
        </summary>
        <PolicyHealth health={d.health} accounts={d.summary.accounts} />
      </details>
    </div>
  );
}
