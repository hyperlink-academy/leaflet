"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";
import {
  AUTH_TOKEN_COOKIE,
  PENDING_MERGE_TOKEN_COOKIE,
  removePendingMergeToken,
  resolveAuthToken,
  setAuthToken,
} from "src/auth";
import { Err, Ok, type Result } from "src/result";
import {
  mergeEmailIdentityIntoAtpIdentity,
  type MergeError,
} from "src/mergeIdentity";

export async function confirmIdentityMerge(): Promise<Result<null, MergeError>> {
  const jar = await cookies();
  const sourceTokenId = jar.get(AUTH_TOKEN_COOKIE)?.value;
  const pendingTokenId = jar.get(PENDING_MERGE_TOKEN_COOKIE)?.value;

  const [source, target] = await Promise.all([
    resolveAuthToken(sourceTokenId),
    resolveAuthToken(pendingTokenId),
  ]);
  if (!source || !target) return Err("merge_not_pending");

  if (source.identity.id === target.identity.id) return Err("same_identity");
  // Source must be an unlinked email account. If it already has atp_did, a
  // merge would silently drop that Bluesky link — refuse.
  if (source.identity.atp_did || !source.identity.email)
    return Err("invalid_source");
  if (!target.identity.atp_did) return Err("invalid_target");

  const result = await mergeEmailIdentityIntoAtpIdentity({
    sourceId: source.identity.id,
    targetId: target.identity.id,
  });
  if (!result.ok) return result;

  await setAuthToken(pendingTokenId!);
  await removePendingMergeToken();
  return Ok(null);
}

export async function cancelIdentityMerge(): Promise<Result<null, MergeError>> {
  const jar = await cookies();
  const pendingTokenId = jar.get(PENDING_MERGE_TOKEN_COOKIE)?.value;
  if (pendingTokenId) {
    // Drop the token row so the orphan credential can't be used later.
    await supabaseServerClient
      .from("email_auth_tokens")
      .delete()
      .eq("id", pendingTokenId);
  }
  await removePendingMergeToken();
  return Ok(null);
}
