import { getCache } from "@vercel/functions";

// Middleware routing entries are cached per-hostname and invalidated by tag
// from every mutation that reassigns a domain, so the TTL is only a backstop
// for writes the app doesn't see (appview-indexed deletions, manual DB edits).
// Lookups that find nothing are cached too — scanner traffic on unregistered
// hostnames (e.g. *.vercel.app) would otherwise query the database on every
// request — but with a shorter TTL since expireTag only reaches the region the
// mutation ran in.
export const DOMAIN_ROUTES_TTL = 60 * 60;
export const NEGATIVE_DOMAIN_ROUTES_TTL = 60 * 10;

// The version suffix keeps entries written with a different value shape from
// being read across a deploy; bump it whenever CachedDomainRoutes changes.
export const domainRoutesCacheKey = (hostname: string) =>
  `domain-routes:v2:${hostname}`;

export const domainRoutesCacheTag = (hostname: string) => `domain:${hostname}`;

export async function expireDomainRoutes(domain: string) {
  try {
    await getCache().expireTag(domainRoutesCacheTag(domain));
  } catch {}
}
