import { cache } from "react";
import { idResolver } from "src/identity";

// The first path segment may be a DID or a handle. Memoized per request so the
// metadata and the page body resolve it once; failures resolve to null and
// each caller treats an unresolvable handle as a 404.
export const resolveDid = cache(async function resolveDid(
  didOrHandle: string,
): Promise<string | null> {
  if (didOrHandle.startsWith("did:")) return didOrHandle;
  try {
    return (await idResolver.handle.resolve(didOrHandle)) ?? null;
  } catch {
    return null;
  }
});
