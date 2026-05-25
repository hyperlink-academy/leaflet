import { supabaseServerClient } from "supabase/serverClient";

export async function canManageDraft(opts: {
  leaflet_id: string;
  current_did: string | null | undefined;
}): Promise<boolean> {
  if (!opts.current_did) return false;

  let { data: link } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("publication, publications(identity_did)")
    .eq("leaflet", opts.leaflet_id)
    .maybeSingle();
  if (!link) return false;

  let ownerDid = (link.publications as { identity_did?: string } | null)
    ?.identity_did;
  if (ownerDid === opts.current_did) return true;
  if (!link.publication) return false;

  let { data: contrib } = await supabaseServerClient
    .from("publication_contributors")
    .select("confirmed")
    .eq("publication_uri", link.publication)
    .eq("contributor_did", opts.current_did)
    .maybeSingle();
  return contrib?.confirmed === true;
}
