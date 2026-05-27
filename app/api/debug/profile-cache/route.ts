import { NextRequest } from "next/server";
import {
  debugFetchProfiles,
  debugReadCache,
  type DebugCacheEntry,
  type Profile,
} from "src/identity/profileCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/debug/profile-cache?dids=did:plc:foo,did:plc:bar
//   Reports what's currently in Redis for each DID and what the upstream
//   Bluesky getProfiles call returns right now. Does not write to the cache.
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("dids");
  if (!param) {
    return Response.json(
      { error: "`dids` query param required (comma-separated)" },
      { status: 400 },
    );
  }

  const dids = Array.from(
    new Set(
      param
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  if (dids.length === 0) {
    return Response.json({ error: "no DIDs provided" }, { status: 400 });
  }

  const [cacheEntries, fetched] = await Promise.all([
    debugReadCache(dids),
    debugFetchProfiles(dids),
  ]);

  const result = dids.map((did) => {
    const cache: DebugCacheEntry = cacheEntries.get(did) ?? { status: "miss" };
    const live: Profile | null = fetched.get(did) ?? null;
    return { did, cache, live };
  });

  return Response.json(
    { dids, result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
