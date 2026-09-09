import { AtUri } from "@atproto/syntax";
import { AtpBaseClient, PubLeafletGraphRecommendations } from "lexicons/api";
import { ids } from "lexicons/api/lexicons";
import { supabaseServerClient } from "supabase/serverClient";

// Recommendations live in a standalone pub.leaflet.graph.recommendations
// record — one per publication, keyed by the publication's rkey so an update
// is a plain putRecord overwrite. An empty list deletes the record. The
// supabase writes mirror what the appview indexes from the firehose: one row
// per recommendation edge, replaced wholesale on update.
export async function writeRecommendations(
  agent: AtpBaseClient,
  publicationUri: string,
  recommendations: string[],
) {
  const pubUri = new AtUri(publicationUri);
  const repo = pubUri.host;
  const collection = ids.PubLeafletGraphRecommendations;
  const recordUri = AtUri.make(repo, collection, pubUri.rkey).toString();

  if (recommendations.length === 0) {
    await agent.com.atproto.repo
      .deleteRecord({ repo, collection, rkey: pubUri.rkey })
      .catch(() => {});
    await supabaseServerClient
      .from("publication_recommendations")
      .delete()
      .eq("uri", recordUri);
    return;
  }

  const record: PubLeafletGraphRecommendations.Record = {
    $type: "pub.leaflet.graph.recommendations",
    publication: publicationUri,
    recommendations,
  };
  await agent.com.atproto.repo.putRecord({
    repo,
    collection,
    rkey: pubUri.rkey,
    record,
    validate: false,
  });
  await supabaseServerClient
    .from("publication_recommendations")
    .delete()
    .eq("uri", recordUri);
  await supabaseServerClient.from("publication_recommendations").insert(
    recommendations.map((recommendation, sort_order) => ({
      uri: recordUri,
      publication: publicationUri,
      recommendation,
      sort_order,
    })),
  );
}
