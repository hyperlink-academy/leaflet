import type { Reason, SignalResult } from "./types";

// Status says what to do with an account; reasons say why. They are worked
// out from the signals on their own, apart from the rules, so an account
// carries every reason that applies to it and not only the one behind the
// rule that happened to match first.
//
// Adding a reason: add an entry here. Order is the order an admin reads them
// in, strongest first.

type Signals = Record<string, SignalResult | undefined>;
type Finder = (s: Signals) => Omit<Reason, "code"> | null;

const count = (s: Signals, id: string) =>
  typeof s[id]?.value === "number" ? (s[id]!.value as number) : 0;
const evidence = (s: Signals, id: string) =>
  (s[id]?.evidence ?? {}) as Record<string, any>;
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export const REASONS: Record<string, Finder> = {
  known_spam_site: (s) => {
    let n = count(s, "links.spam_domains");
    let site = evidence(s, "links.spam_domains").domain;
    if (n === 0 || !site) return null;
    return {
      text: `Most of its posts link to ${site}, the same site ${plural(n, "account")} an admin marked as spam ${n === 1 ? "is" : "are"} devoted to.`,
      site,
    };
  },
  link_farm: (s) => {
    let n = count(s, "links.farm_accounts");
    let site = evidence(s, "links.farm_accounts").domain;
    if (n === 0 || !site) return null;
    return {
      text: `Most of its posts link to ${site}, and ${plural(n, "other account")} with no followers ${n === 1 ? "does" : "do"} the same.`,
      site,
    };
  },
  shared_link_targets: (s) => {
    let partner = evidence(s, "links.shared_domains").partners?.[0];
    if (!partner || partner.shared < 3) return null;
    let sites: string[] = partner.domains ?? [];
    return {
      text: `Links to ${partner.shared} of the same uncommon sites as another account: ${sites.slice(0, 4).join(", ")}${sites.length > 4 ? " and others" : ""}.`,
      account: partner.did,
    };
  },
  model_spam: (s) => modelReason(s, "spam", "The model read its posts as spam"),
  model_unsure: (s) =>
    modelReason(s, "unsure", "The model read its posts and couldn't decide"),
  backlink_posts: (s) => {
    let e = evidence(s, "links.single_target_share");
    if (count(s, "links.single_target_share") < 0.8 || (e.documents ?? 0) < 3)
      return null;
    return {
      text: `${e.singleTarget} of its ${e.documents} posts each link to exactly one site.`,
    };
  },
  burst: (s) => {
    let n = count(s, "publish.burst");
    if (n < 5) return null;
    return { text: `Published ${n} posts within one hour.` };
  },
  empty_profile: (s) => {
    if (s["account.profile"]?.value !== "empty") return null;
    let e = evidence(s, "account.profile");
    return {
      text: `Its Bluesky account has ${plural(e.followers ?? 0, "follower")}, no bio and no display name.`,
    };
  },
  established_profile: (s) => {
    if (s["account.profile"]?.value !== "established") return null;
    let e = evidence(s, "account.profile");
    return {
      text: `Established Bluesky account: ${plural(e.followers ?? 0, "follower")}, ${plural(e.posts ?? 0, "post")}, ${e.ageDays} days old.`,
    };
  },
  model_legit: (s) =>
    modelReason(s, "legit", "The model read its posts as legitimate"),
};

function modelReason(s: Signals, verdict: string, lead: string) {
  if (s["content.llm"]?.value !== verdict) return null;
  let e = evidence(s, "content.llm");
  let category =
    e.category && e.category !== "none"
      ? ` (${String(e.category).replaceAll("_", " ")})`
      : "";
  return { text: `${lead}${category}: ${e.reason ?? "no explanation given."}` };
}

export function explain(signals: Signals): Reason[] {
  return Object.entries(REASONS).flatMap(([code, find]) => {
    let found = find(signals);
    return found ? { code, ...found } : [];
  });
}

// Short names for filters and counts.
export const REASON_LABELS: Record<string, string> = {
  known_spam_site: "Known spam site",
  link_farm: "Link farm",
  shared_link_targets: "Shared link targets",
  model_spam: "Model says spam",
  model_unsure: "Model unsure",
  backlink_posts: "One-link posts",
  burst: "Posting burst",
  empty_profile: "Empty profile",
  established_profile: "Established profile",
  model_legit: "Model says fine",
};
