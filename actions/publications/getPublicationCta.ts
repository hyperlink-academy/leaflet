"use server";

import { savedCtaDefaults, type CtaDefaults } from "src/publicationDefaults";
import { supabaseServerClient } from "supabase/serverClient";

export async function getPublicationCta(
  publicationUri: string,
): Promise<CtaDefaults> {
  const { data } = await supabaseServerClient
    .from("publications")
    .select("defaults")
    .eq("uri", publicationUri)
    .maybeSingle();
  return savedCtaDefaults(data?.defaults);
}
