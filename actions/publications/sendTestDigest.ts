"use server";

import { getAuthIdentity } from "src/auth";
import { isDevMode } from "src/utils/isDevMode";
import { EMAIL_REGEX } from "src/utils/confirmationEmail";
import { sendDigest } from "src/digests/send";
import { Err } from "src/result";
import { isPostmarkConfigured } from "src/notificationEmails/postmark";

export async function sendTestDigest(publication: string) {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did || !isDevMode(identity))
    return Err("unauthorized" as const);
  if (!identity.email || !EMAIL_REGEX.test(identity.email))
    return Err("email_required" as const);
  const apiKey = process.env.POSTMARK_API_KEY;
  if (!isPostmarkConfigured(apiKey))
    return Err("email_not_configured" as const);
  try {
    return await sendDigest({
      identity: identity.id,
      ownerDid: identity.atp_did,
      publication,
      email: identity.email,
      apiKey,
    });
  } catch {
    return Err("database_error" as const);
  }
}
