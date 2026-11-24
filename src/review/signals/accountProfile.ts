import type { Signal } from "../types";

const DAY = 86400000;

// How much of a person the Bluesky account behind the author looks like.
// Context for the policy, never a verdict on its own: plenty of real writers
// arrive with a new, empty account.
export const accountProfile: Signal = {
  id: "account.profile",
  version: 1,
  cost: "cheap",
  async compute(account, ctx) {
    let p = account.profile;
    if (!p) return { value: null };
    let ageDays = p.createdAt
      ? Math.floor((ctx.now.getTime() - Date.parse(p.createdAt)) / DAY)
      : null;
    let evidence = {
      handle: p.handle,
      followers: p.followers,
      follows: p.follows,
      posts: p.posts,
      ageDays,
      hasBio: !!p.bio,
    };
    if (p.followers >= 50 && p.posts >= 30 && (ageDays ?? 0) >= 60)
      return { value: "established", evidence };
    if (p.followers < 5 && !p.bio && !p.displayName)
      return { value: "empty", evidence };
    return { value: "thin", evidence };
  },
};
