import type { ProposedStatus, SignalValue } from "./types";

// Bump when a rule or threshold changes, so decisions in review_events can be
// told apart by the policy that made them.
export const POLICY_VERSION = 2;

// While this is "dry-run" every decision is a proposal: recorded, shown at
// /admin/review, and read by nothing that changes what a visitor sees.
export const REVIEW_MODE: "dry-run" | "live" = "dry-run";

type Values = Record<string, SignalValue | undefined>;

export type Rule = {
  id: string;
  when: (v: Values) => boolean;
  // Costly signals to compute before the rules are read again from the top.
  run?: string[];
  then?: ProposedStatus;
  escalate?: boolean;
};

const num = (v: Values, id: string) =>
  typeof v[id] === "number" ? (v[id] as number) : 0;

// First match wins.
export const RULES: Rule[] = [
  {
    id: "known-spam-site",
    when: (v) => num(v, "links.spam_domains") >= 1,
    then: "spam",
  },
  {
    id: "link-farm",
    when: (v) =>
      num(v, "links.farm_accounts") >= 5 && v["account.profile"] === "empty",
    then: "spam",
  },
  {
    id: "link-farm-small",
    when: (v) =>
      num(v, "links.farm_accounts") >= 2 &&
      v["account.profile"] !== "established",
    then: "held",
    escalate: true,
  },
  {
    id: "link-ring",
    when: (v) =>
      num(v, "links.shared_domains") >= 3 &&
      num(v, "links.single_target_share") >= 0.8 &&
      v["account.profile"] === "empty",
    then: "held",
    escalate: true,
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
  { id: "llm-unsure", when: () => true, then: "pending", escalate: true },
];
