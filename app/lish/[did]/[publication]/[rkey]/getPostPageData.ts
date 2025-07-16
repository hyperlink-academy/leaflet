import { supabaseServerClient } from "supabase/serverClient";

export type PostPageData = Awaited<ReturnType<typeof getPostPageData>>;
export async function getPostPageData(uri: string) {
  let { data: document } = await supabaseServerClient
    .from("documents")
    .select(
      `
        data,
        documents_in_publications(publications(*, publication_subscriptions(*))),
        document_mentions_in_bsky(*, bsky_posts(*)),
        leaflets_in_publications(*)
        `,
    )
    .eq("uri", uri)
    .single();
  return document;
}
