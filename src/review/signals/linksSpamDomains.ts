import type { Signal } from "../types";
import { dominantDomainPeers } from "./linksFarmAccounts";

// How many accounts an admin has marked as spam are devoted to the same site
// this account is devoted to. This is how a handful of human decisions reach
// the rest of a farm.
export const linksSpamDomains: Signal = {
  id: "links.spam_domains",
  version: 2,
  cost: "cheap",
  async compute(account, ctx) {
    let { domain, peers } = await dominantDomainPeers(
      ctx.db,
      account.did,
      account.documents.length,
      "s.human_label = 'spam'",
    );
    return {
      value: peers.length,
      evidence: { domain, spamAccounts: peers.slice(0, 10) },
    };
  },
};
