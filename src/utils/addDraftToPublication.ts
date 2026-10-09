import { supabaseServerClient } from "supabase/serverClient";

// Makes a leaflet a draft of a publication, crediting `actorDid` in its
// byline. Callers must have established that the actor may act on the
// publication.
export async function addDraftToPublication(args: {
  leaflet_id: string;
  publication_uri: string;
  actorDid: string;
  title: string;
  description: string;
  tags?: string[];
  entitiesToDelete: string[];
}) {
  let { error } = await supabaseServerClient
    .from("leaflets_in_publications")
    .insert({
      publication: args.publication_uri,
      leaflet: args.leaflet_id,
      doc: null,
      title: args.title,
      description: args.description,
      ...(args.tags && { tags: args.tags }),
    });
  if (error) return { error };

  await supabaseServerClient
    .from("leaflet_contributors")
    .upsert(
      { leaflet: args.leaflet_id, contributor_did: args.actorDid },
      { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
    );

  if (args.entitiesToDelete.length > 0)
    await supabaseServerClient
      .from("entities")
      .delete()
      .in("id", args.entitiesToDelete);
  return { error: null };
}
