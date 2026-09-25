import { sql } from "drizzle-orm";

// The one definition of "trending": engagement over a super-linear time decay,
// with a recommend worth five Bluesky likes. Both /reader/trending
// (actions/reader/getHotFeed.ts) and the tag views order by this, so they rank
// a given post identically.
//
// Interpolated into a query whose `documents` row is aliased `d`.
export const TRENDING_RANK = sql`
  (d.bsky_like_count + d.recommend_count * 5)::numeric
  / power(extract(epoch from (now() - d.sort_date)) / 3600 + 2, 1.5)
`;
