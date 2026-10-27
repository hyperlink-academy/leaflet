"use server";

import { getAuthIdentity } from "src/auth";
import { loadPendingActions } from "src/pendingActions";
import type { PublicationsPendingActions } from "src/pendingActionKinds";

export async function getMyPendingActions(): Promise<PublicationsPendingActions> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return {};
  return loadPendingActions(identity.atp_did);
}
