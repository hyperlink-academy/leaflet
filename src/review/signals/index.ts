import type { Signal } from "../types";
import { accountProfile } from "./accountProfile";
import { publishBurst } from "./publishBurst";
import { linksSingleTarget } from "./linksSingleTarget";
import { linksSharedDomains } from "./linksSharedDomains";
import { linksFarmAccounts } from "./linksFarmAccounts";
import { linksSpamDomains } from "./linksSpamDomains";
import { contentLlm } from "./contentLlm";

// Adding a signal: write its file, add it here, then reference its id from a
// rule in policy.ts. Cheap signals run for every subject, in this order.
export const SIGNALS: Signal[] = [
  accountProfile,
  publishBurst,
  linksSingleTarget,
  linksSharedDomains,
  linksFarmAccounts,
  linksSpamDomains,
  contentLlm,
];

export const SIGNALS_BY_ID: Record<string, Signal | undefined> =
  Object.fromEntries(SIGNALS.map((s) => [s.id, s]));
