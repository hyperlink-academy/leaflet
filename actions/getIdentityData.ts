"use server";

import { cache } from "react";
import { getValidAuthToken } from "src/identityPayload";
import { loadIdentity } from "src/identitySlices";

export const getIdentityData = cache(async () => {
  let auth_token = await getValidAuthToken();
  if (!auth_token) return null;
  return loadIdentity(auth_token, { fresh: false });
});

// The client provider's revalidation path: always authoritative (it runs right
// after a mutation) and it warms every slice for the next server render.
export async function getFreshIdentityData() {
  let auth_token = await getValidAuthToken();
  if (!auth_token) return null;
  return loadIdentity(auth_token, { fresh: true });
}
