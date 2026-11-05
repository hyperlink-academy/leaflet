"use server";

import { z } from "zod";
import { getAuthIdentity } from "src/auth";
import { Err, Ok } from "src/result";
import { supabaseServerClient } from "supabase/serverClient";

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

export async function getNotificationPreference(publication: string) {
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
  return Ok<"off" | "daily" | "weekly">(
    frequency === "daily" || frequency === "weekly" ? frequency : "off",
  );
}

export async function setNotificationPreference(
  publication: string,
  frequency: "off" | "daily" | "weekly",
) {
  if (!z.enum(["off", "daily", "weekly"]).safeParse(frequency).success)
    return Err("invalid_frequency" as const);
  const identity = await authorize(publication);
  if (!identity) return Err("unauthorized" as const);
  const { error } = await supabaseServerClient
    .from("notification_preferences")
    .upsert(
      {
        identity: identity.id,
        publication,
        channel: "email",
        enabled_types: frequency === "off" ? [] : ["digest"],
        digest_frequency: frequency === "off" ? null : frequency,
      },
      { onConflict: "identity,publication,channel" },
    );
  return error ? Err("database_error" as const) : Ok(null);
}
