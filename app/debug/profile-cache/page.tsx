import {
  debugFetchProfiles,
  debugReadCache,
  type DebugCacheEntry,
  type Profile,
} from "src/identity/profileCache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ dids?: string }>;

export default async function ProfileCacheDebugPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { dids: didsParam } = await searchParams;
  const dids = parseDids(didsParam);

  let rows: {
    did: string;
    cache: DebugCacheEntry;
    live: Profile | null;
  }[] = [];

  if (dids.length > 0) {
    const [cacheEntries, fetched] = await Promise.all([
      debugReadCache(dids),
      debugFetchProfiles(dids),
    ]);
    rows = dids.map((did) => ({
      did,
      cache: cacheEntries.get(did) ?? { status: "miss" },
      live: fetched.get(did) ?? null,
    }));
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold">Profile Cache Debug</h1>
      <p className="text-sm text-tertiary">
        Shows what&apos;s in the Redis cache and what bsky&apos;s
        getProfiles returns right now. The cache is not updated.
      </p>

      <form method="get" className="flex flex-col gap-2">
        <label htmlFor="dids" className="text-sm font-bold">
          DIDs (comma- or whitespace-separated)
        </label>
        <textarea
          id="dids"
          name="dids"
          defaultValue={didsParam ?? ""}
          rows={4}
          className="border border-border rounded-md p-2 font-mono text-sm"
          placeholder="did:plc:..., did:plc:..."
        />
        <button
          type="submit"
          className="self-start bg-accent-1 text-accent-2 font-bold px-3 py-1 rounded-md text-sm"
        >
          Inspect
        </button>
      </form>

      {dids.length === 0 ? (
        <div className="text-sm italic text-tertiary">
          Enter one or more DIDs above to inspect.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <ProfileRow key={row.did} {...row} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileRow(props: {
  did: string;
  cache: DebugCacheEntry;
  live: Profile | null;
}) {
  return (
    <div className="border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="font-mono text-sm font-bold break-all">{props.did}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Pane title={`Cache — ${cacheLabel(props.cache)}`}>
          <pre className="text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(props.cache, null, 2)}
          </pre>
        </Pane>
        <Pane title={`Live — ${props.live ? "found" : "null"}`}>
          <pre className="text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(props.live, null, 2)}
          </pre>
        </Pane>
      </div>
      <DiffSummary cache={props.cache} live={props.live} />
    </div>
  );
}

function Pane({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-bold text-tertiary uppercase">{title}</div>
      <div className="bg-border-light rounded-md p-2 overflow-auto">
        {children}
      </div>
    </div>
  );
}

function cacheLabel(entry: DebugCacheEntry) {
  if (entry.status !== "hit") return entry.status;
  const ageSec = Math.round(entry.ageMs / 1000);
  return entry.expired
    ? `hit (expired, age ${ageSec}s)`
    : `hit (age ${ageSec}s)`;
}

function DiffSummary({
  cache,
  live,
}: {
  cache: DebugCacheEntry;
  live: Profile | null;
}) {
  if (cache.status !== "hit") {
    return (
      <div className="text-xs italic text-tertiary">
        Nothing in cache to compare.
      </div>
    );
  }
  const cached = cache.profile;
  if (!cached && !live) {
    return (
      <div className="text-xs italic text-tertiary">
        Both cache and live are null (negative cache hit).
      </div>
    );
  }
  if (!cached || !live) {
    return (
      <div className="text-xs italic text-accent-contrast">
        Mismatch: one side is null ({!cached ? "cache" : "live"}).
      </div>
    );
  }
  const fields: (keyof Profile)[] = [
    "handle",
    "displayName",
    "avatar",
    "description",
  ];
  const diffs = fields.filter((f) => cached[f] !== live[f]);
  if (diffs.length === 0) {
    return (
      <div className="text-xs italic text-tertiary">
        Cache matches live for handle/displayName/avatar/description.
      </div>
    );
  }
  return (
    <div className="text-xs flex flex-col gap-0.5">
      <div className="font-bold">Differs on: {diffs.join(", ")}</div>
      {diffs.map((f) => (
        <div key={f} className="font-mono">
          <span className="text-tertiary">{f}:</span>{" "}
          <span>cache={JSON.stringify(cached[f])}</span>{" "}
          <span>live={JSON.stringify(live[f])}</span>
        </div>
      ))}
    </div>
  );
}

function parseDids(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}
