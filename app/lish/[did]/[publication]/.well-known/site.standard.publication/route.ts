import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { supabaseServerClient } from "supabase/serverClient";

export async function GET(
  req: Request,
  props: {
    params: Promise<{ publication: string; did: string }>;
  },
) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);
  let [{ data: publications }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select(
        `*,
        publication_subscriptions(*),
        documents_in_publications(documents(
          *,
          comments_on_documents(count),
          document_mentions_in_bsky(count)
        ))
      `,
      )
      .eq("identity_did", did)
      .or(publicationNameOrUriFilter(did, publication_name))
      .order("uri", { ascending: false })
      .limit(1),
  ]);
  let publication = publications?.[0];
  if (!did || !publication) return new Response(null, { status: 404 });
  return new Response(publication.uri);
}
