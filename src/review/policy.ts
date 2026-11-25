import type { ProposedStatus, SignalValue } from "./types";

// Bump when a rule or threshold changes, so decisions in review_events can be
// told apart by the policy that made them.
export const POLICY_VERSION = 4;

// Whether rules marked autoBlock block an account on their own. Set to false
// and every decision is only a proposal: recorded, shown at /admin/review,
// and read by nothing that changes what a visitor sees.
export const AUTO_BLOCK: boolean = true;
export const REVIEW_MODE = AUTO_BLOCK ? "live" : "dry-run";

type Values = Record<string, SignalValue | undefined>;

export type Rule = {
  id: string;
  when: (v: Values) => boolean;
  // Costly signals to compute before the rules are read again from the top.
  run?: string[];
  then?: ProposedStatus;
  // Only for rules that rest on evidence a person could check at a glance.
  // A rule that proposes spam without this still waits for an admin.
  autoBlock?: boolean;
};

const num = (v: Values, id: string) =>
  typeof v[id] === "number" ? (v[id] as number) : 0;

// An empty profile, or none on file: the lookup found no account to describe.
const noProfile = (v: Values) =>
  v["account.profile"] === "empty" || v["account.profile"] == null;

// First match wins.
export const RULES: Rule[] = [
  {
    id: "known-spam-site",
    when: (v) => num(v, "links.spam_domains") >= 1,
    then: "spam",
    autoBlock: true,
  },
  {
    id: "link-farm",
    when: (v) =>
      num(v, "links.farm_accounts") >= 5 &&
      v["account.profile"] !== "established",
    then: "spam",
    autoBlock: true,
  },
  {
    // A farm too small to block on size alone, where everything else about
    // the account says the same thing: nobody behind it, and nearly every
    // post exists to carry one link.
    id: "link-farm-backlinks",
    when: (v) =>
      num(v, "links.farm_accounts") >= 2 &&
      noProfile(v) &&
      num(v, "links.single_target_share") >= 0.8,
    then: "spam",
    autoBlock: true,
  },
  {
    id: "link-farm-small",
    when: (v) =>
      num(v, "links.farm_accounts") >= 2 &&
      v["account.profile"] !== "established",
    then: "needs_review",
  },
  {
    id: "link-ring",
    when: (v) =>
      num(v, "links.shared_domains") >= 3 &&
      num(v, "links.single_target_share") >= 0.8 &&
      v["account.profile"] === "empty",
    then: "needs_review",
  },
  {
    id: "established-author",
    when: (v) =>
      v["account.profile"] === "established" &&
      num(v, "links.single_target_share") < 0.5 &&
      num(v, "links.farm_accounts") === 0,
    then: "cleared",
  },
  {
    id: "content-check",
    when: (v) => v["content.llm"] === undefined,
    run: ["content.llm"],
  },
  { id: "llm-spam", when: (v) => v["content.llm"] === "spam", then: "spam" },
  {
    id: "llm-legit",
    when: (v) => v["content.llm"] === "legit",
    then: "cleared",
  },
  { id: "llm-unsure", when: () => true, then: "needs_review" },
];
