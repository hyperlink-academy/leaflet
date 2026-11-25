"use server";

import { getAuthIdentity } from "src/auth";
import { isConfirmedContributor } from "src/contributorPermissions";
import {
  readContentGateDefaults,
  toContentGateDefaults,
} from "src/publicationDefaults";
import { Err, Ok, type Result } from "src/result";
import type { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";

export async function saveContentGateDefaults(
  publicationUri: string,
  contentGate: unknown,
): Promise<Result<null, "unauthorized" | "invalid" | "database_error">> {
  const config = readContentGateDefaults(contentGate);
  if (!config) return Err("invalid");

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

  // Other sections are kept as they are, including ones this code doesn't
  // know about.
  const existing =
    publication.defaults &&
    typeof publication.defaults === "object" &&
    !Array.isArray(publication.defaults)
      ? publication.defaults
      : {};
  const { error } = await supabaseServerClient
    .from("publications")
    .update({
      defaults: {
        ...existing,
        contentGate: toContentGateDefaults(config),
      } as Json,
    })
    .eq("uri", publicationUri);
  if (error) {
    console.error("[saveContentGateDefaults] update failed", error);
    return Err("database_error");
  }
  return Ok(null);
}
