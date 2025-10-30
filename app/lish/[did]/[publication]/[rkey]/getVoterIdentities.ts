"use server";

import { idResolver } from "app/(home-pages)/reader/idResolver";

export type VoterIdentity = {
  did: string;
  handle: string | null;
};

export async function getVoterIdentities(
  dids: string[],
): Promise<VoterIdentity[]> {
  const identities = await Promise.all(
    dids.map(async (did) => {
      try {
        const resolved = await idResolver.did.resolve(did);
        const handle = resolved?.alsoKnownAs?.[0]
          ? resolved.alsoKnownAs[0].slice(5) // Remove "at://" prefix
          : null;
        return {
          did,
          handle,
        };
      } catch (error) {
        console.error(`Failed to resolve DID ${did}:`, error);
        return {
          did,
          handle: null,
        };
      }
    }),
  );

  return identities;
}
