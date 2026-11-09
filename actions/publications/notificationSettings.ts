"use server";

import {
  notificationPreferenceSchema,
  type NotificationPreference,
  type NotificationPreferences,
} from "src/notificationPreferences";
import { getAuthIdentity } from "src/auth";
import { Err, Ok } from "src/result";
import { supabaseServerClient } from "supabase/serverClient";
import { queueDigestSchedule } from "src/digests/schedule";
import { isDigestFrequency } from "src/digests/frequencies";

async function authorize(publication: string) {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return null;
  const { data, error } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .eq("uri", publication)
    .maybeSingle();
  if (error || data?.identity_did !== identity.atp_did) return null;
  return identity;
}

// Load all email choices together; existing publications remain opted out.
export async function getNotificationPreferences(publication: string) {
  const identity = await authorize(publication);
  if (!identity) return Err("unauthorized" as const);
  const { data, error } = await supabaseServerClient
    .from("notification_preferences")
    .select("enabled_types, digest_frequency")
    .eq("identity", identity.id)
    .eq("publication", publication)
    .eq("channel", "email")
    .maybeSingle();
  if (error) return Err("database_error" as const);
  const frequency = data?.enabled_types.includes("digest")
    ? data.digest_frequency
    : null;
  return Ok<NotificationPreferences>({
    digest: isDigestFrequency(frequency) ? frequency : "off",
    comments: data?.enabled_types.includes("comments") ? "instant" : "off",
  });
}

// Validate and save one choice atomically, preserving other notification types.
export async function setNotificationPreference(
  publication: string,
  preference: NotificationPreference,
) {
  const parsed = notificationPreferenceSchema.safeParse(preference);
  if (!parsed.success) return Err("invalid_frequency" as const);
  const identity = await authorize(publication);
  if (!identity) return Err("unauthorized" as const);
  const { type, frequency } = parsed.data;
  const { error } = await supabaseServerClient.rpc(
    "set_notification_preference",
    {
      p_identity: identity.id,
      p_publication: publication,
      p_type: type,
      p_frequency: frequency,
    },
  );
  if (error) return Err("database_error" as const);
  if (type === "digest" && frequency !== "off") {
    try {
      await queueDigestSchedule(identity.id, publication);
    } catch {
      return Err("schedule_error" as const);
    }
  }
  return Ok(null);
}
