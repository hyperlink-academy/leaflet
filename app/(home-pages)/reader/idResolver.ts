import { IdResolver } from "@atproto/identity";
import type { DidCache, CacheResult, DidDocument } from "@atproto/identity";
import Client from "ioredis";
// Create Redis client for DID caching
let redisClient: Client | null = null;
if (process.env.REDIS_URL) {
  redisClient = new Client(process.env.REDIS_URL);
}

// Redis-based DID cache implementation
class RedisDidCache implements DidCache {
  private staleTTL: number;
  private maxTTL: number;

  constructor(
    private client: Client,
    staleTTL = 60 * 60, // 1 hour
    maxTTL = 60 * 60 * 24, // 24 hours
  ) {
    this.staleTTL = staleTTL;
    this.maxTTL = maxTTL;
  }

  async cacheDid(did: string, doc: DidDocument): Promise<void> {
    const cacheVal = {
      doc,
      updatedAt: Date.now(),
    };
    await this.client.setex(
      `did:${did}`,
      this.maxTTL,
      JSON.stringify(cacheVal),
    );
  }

  async checkCache(did: string): Promise<CacheResult | null> {
    const cached = await this.client.get(`did:${did}`);
    if (!cached) return null;

    const { doc, updatedAt } = JSON.parse(cached);
    const now = Date.now();
    const age = now - updatedAt;

    return {
      did,
      doc,
      updatedAt,
      stale: age > this.staleTTL * 1000,
      expired: age > this.maxTTL * 1000,
    };
  }

  async refreshCache(
    did: string,
    getDoc: () => Promise<DidDocument | null>,
  ): Promise<void> {
    const doc = await getDoc();
    if (doc) {
      await this.cacheDid(did, doc);
    }
  }

  async clearEntry(did: string): Promise<void> {
    await this.client.del(`did:${did}`);
  }

  async clear(): Promise<void> {
    const keys = await this.client.keys("did:*");
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}

// Create IdResolver with Redis-based DID cache
export const idResolver = new IdResolver({
  didCache: redisClient ? new RedisDidCache(redisClient) : undefined,
});
