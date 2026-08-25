import Client from "ioredis";
import Redlock from "redlock";

// Publishing reads "does this draft already have a document?" and then writes
// one, so two overlapping publishes of the same draft each mint a fresh rkey
// and one of the resulting posts is left unlinked from the draft. Publishes
// are serialized per leaflet: an in-process set catches overlap within one
// server instance and, in production, a Redis lock catches overlap across
// instances. A busy caller is refused rather than queued — a queued duplicate
// would run as an "update" and hand its caller a second success (and a second
// Bluesky post).
const LOCK_TTL_MS = 5 * 60_000;
const inFlight = new Set<string>();

const globalForPublishLock = globalThis as unknown as {
  __publishRedlock?: Redlock | null;
};

function getRedlock(): Redlock | null {
  if (globalForPublishLock.__publishRedlock === undefined) {
    globalForPublishLock.__publishRedlock =
      process.env.NODE_ENV === "production" && process.env.REDIS_URL
        ? new Redlock([new Client(process.env.REDIS_URL)], { retryCount: 0 })
        : null;
  }
  return globalForPublishLock.__publishRedlock;
}

// Redlock reports a failed acquire as an ExecutionError whose per-attempt
// votes carry the reason; only a ResourceLockedError vote means someone else
// holds the lock (anything else is Redis being unreachable, which should
// surface). The classes aren't reachable through the repo's redlock type shim,
// so they're matched by name.
type ExecutionStats = { votesAgainst: Map<unknown, Error> };
async function isHeldElsewhere(error: unknown): Promise<boolean> {
  if (!(error instanceof Error) || error.name !== "ExecutionError")
    return false;
  let attempts = (
    error as { attempts?: ReadonlyArray<Promise<ExecutionStats>> }
  ).attempts;
  let stats = await Promise.all(attempts ?? []);
  return stats.some((attempt) =>
    [...attempt.votesAgainst.values()].some(
      (vote) => vote.name === "ResourceLockedError",
    ),
  );
}

export type PublishLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false };

export async function withPublishLock<T>(
  leaflet_id: string,
  fn: () => Promise<T>,
): Promise<PublishLockResult<T>> {
  if (inFlight.has(leaflet_id)) return { acquired: false };
  inFlight.add(leaflet_id);
  try {
    let redlock = getRedlock();
    let lock = null;
    if (redlock) {
      try {
        lock = await redlock.acquire([`publish:${leaflet_id}`], LOCK_TTL_MS);
      } catch (error) {
        if (await isHeldElsewhere(error)) return { acquired: false };
        throw error;
      }
    }
    try {
      return { acquired: true, value: await fn() };
    } finally {
      if (lock) await lock.release().catch(console.error);
    }
  } finally {
    inFlight.delete(leaflet_id);
  }
}
