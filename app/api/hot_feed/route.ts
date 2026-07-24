export const runtime = "nodejs";

import { getHotFeed } from "app/(app)/(home-pages)/reader/getHotFeed";

// The hot feed is identical for every user and already served 5 minutes
// stale from redis. Exposing it as a CDN-cacheable GET collapses every
// client's refetch into roughly one origin hit per TTL, instead of one
// uncacheable invocation + full 50-post response per reader.
export async function GET() {
  let data = await getHotFeed();
  return Response.json(data, {
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
      "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
