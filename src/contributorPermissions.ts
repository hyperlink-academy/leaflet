import { supabaseServerClient } from "supabase/serverClient";

/**
 * Whether `did` is a confirmed contributor on a publication. This is the shared
 * "is contributor" check used by every server action that lets contributors act
 * on the owner's behalf (create draft, publish, delete). Owner checks are done
 * by callers since they already have the owner DID in hand.
 */
export async function isConfirmedContributor(
  publication_uri: string,
  did: string,
): Promise<boolean> {
  let { data } = await supabaseServerClient
    .from("publication_contributors")
    .select("confirmed")
    .eq("publication_uri", publication_uri)
    .eq("contributor_did", did)
    .maybeSingle();
  return data?.confirmed === true;
}

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

  return isConfirmedContributor(link.publication, opts.current_did);
}
