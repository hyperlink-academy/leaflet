import { supabaseServerClient } from "supabase/serverClient";

// The publication served on a custom domain, if any. Cross-domain login lands
// on the main-site confirm page after leaving the publication's domain;
// resolving the originating host back to its publication lets that page adopt
// the publication's theme. Mirrors the custom_domains -> publication_domains ->
// publications lookup the middleware uses to route custom domains.
export async function publicationUriForHost(
  host: string,
): Promise<string | null> {
  let { data } = await supabaseServerClient
    .from("custom_domains")
    .select("publication_domains(publications(uri))")
    .eq("domain", host)
    .maybeSingle();
  return data?.publication_domains?.[0]?.publications?.uri ?? null;
}
