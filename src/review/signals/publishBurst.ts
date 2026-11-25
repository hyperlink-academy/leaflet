import type { Signal } from "../types";

const HOUR = 3600000;

// The most documents published inside any one hour.
export const publishBurst: Signal = {
  id: "publish.burst",
  version: 2,
  cost: "cheap",
  async compute(account) {
    let times = account.documents
      .flatMap((d) => (d.publishedAt ? Date.parse(d.publishedAt) : []))
      .sort((a, b) => a - b);
    let best = 0;
    let bestStart: number | null = null;
    for (let end = 0, start = 0; end < times.length; end++) {
      while (times[end] - times[start] > HOUR) start++;
      if (end - start + 1 > best) {
        best = end - start + 1;
        bestStart = times[start];
      }
    }
    return {
      value: best,
      evidence: {
        hourStarting: bestStart ? new Date(bestStart).toISOString() : null,
      },
    };
  },
};
