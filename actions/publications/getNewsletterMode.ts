"use server";

import { supabaseServerClient } from "supabase/serverClient";

// The reader feed's Post payload doesn't carry newsletter settings, so
// subscribe surfaces built on it (e.g. the post viewer toolbar) fetch the flag
// separately. Public info — it only says how a publication delivers posts.
export async function getPublicationNewsletterMode(
  publicationUri: string,
): Promise<boolean> {
  const { data } = await supabaseServerClient
    .from("publication_newsletter_settings")
    .select("enabled")
    .eq("publication", publicationUri)
    .maybeSingle();
  return !!data?.enabled;
}
