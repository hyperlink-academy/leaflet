import { distinctDomains } from "../content";
import type { Signal } from "../types";

// The share of documents whose outbound links all go to one site: the shape
// of an article written to carry a backlink.
export const linksSingleTarget: Signal = {
  id: "links.single_target_share",
  version: 1,
  cost: "cheap",
  async compute(account) {
    let docs = account.documents;
    if (docs.length === 0) return { value: 0 };
    let counts = new Map<string, number>();
    let single = 0;
    let linked = 0;
    for (let doc of docs) {
      let domains = distinctDomains(doc);
      if (domains.length > 0) linked++;
      if (domains.length === 1) {
        single++;
        counts.set(domains[0], (counts.get(domains[0]) ?? 0) + 1);
      }
    }
    let targets = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([domain, documents]) => ({ domain, documents }));
    return {
      value: Number((single / docs.length).toFixed(3)),
      evidence: {
        documents: docs.length,
        withLinks: linked,
        singleTarget: single,
        distinctTargets: counts.size,
        targets,
      },
    };
  },
};
