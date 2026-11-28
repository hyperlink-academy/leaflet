"use server";

import { getAuthIdentity } from "src/auth";
import { isConfirmedContributor } from "src/contributorPermissions";
import {
  ctaTooLongField,
  isCtaSection,
  readCtaText,
  type CtaText,
} from "src/publicationDefaults";
import { Err, Ok, type Result } from "src/result";
import type { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";
import { revalidatePublicationSettingsPaths } from "src/utils/revalidatePublication";

export async function saveCtaDefaults(
  publicationUri: string,
  section: unknown,
  text: unknown,
): Promise<
  Result<
    CtaText,
    | "unauthorized"
    | "invalid"
    | "header_too_long"
    | "description_too_long"
    | "database_error"
  >
> {
  if (!isCtaSection(section)) return Err("invalid");
  const tooLong = ctaTooLongField(text);
  if (tooLong) return Err(`${tooLong}_too_long` as const);
  const saved = readCtaText(section, text);
  if (!saved) return Err("invalid");

  const [identity, { data: publication }] = await Promise.all([
    getAuthIdentity(),
    supabaseServerClient
      .from("publications")
      .select("identity_did, defaults")
      .eq("uri", publicationUri)
      .single(),
  ]);
  const did = identity?.atp_did;
  if (!did || !publication) return Err("unauthorized");
  if (
    publication.identity_did !== did &&
    !(await isConfirmedContributor(publicationUri, did))
  )
    return Err("unauthorized");

  const existing = asObject(publication.defaults);
  const cta = { ...asObject(existing.cta) };
  if (Object.keys(saved).length) cta[section] = saved;
  else delete cta[section];

  const { error } = await supabaseServerClient
    .from("publications")
    .update({ defaults: { ...existing, cta } as Json })
    .eq("uri", publicationUri);
  if (error) {
    console.error("[saveCtaDefaults] update failed", error);
    return Err("database_error");
  }
  await revalidatePublicationSettingsPaths(publicationUri);
  return Ok(saved);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
