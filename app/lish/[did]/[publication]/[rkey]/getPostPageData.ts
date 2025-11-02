import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { getConstellationBacklinks } from "./Interactions/getBlueskyMentions";
import { PubLeafletPublication } from "lexicons/api";

export async function getPostPageData(uri: string) {
  let { data: document } = await supabaseServerClient
    .from("documents")
    .select(
      `
        data,
        uri,
        comments_on_documents(*, bsky_profiles(*)),
        documents_in_publications(publications(*, publication_subscriptions(*))),
        document_mentions_in_bsky(*),
        leaflets_in_publications(*)
        `,
    )
    .eq("uri", uri)
    .single();

  if (!document) return null;

  // Fetch constellation backlinks for mentions
  const pubRecord = document.documents_in_publications[0]?.publications
    ?.record as PubLeafletPublication.Record;
  const rkey = new AtUri(uri).rkey;
  const postUrl = `https://${pubRecord?.base_path}/${rkey}`;
  const constellationBacklinks = await getConstellationBacklinks(postUrl);

  // Combine database mentions and constellation backlinks
  const quotesAndMentions: { uri: string; link?: string }[] = [
    // Database mentions (quotes with link to quoted content)
    ...document.document_mentions_in_bsky.map((m) => ({
      uri: m.uri,
      link: m.link,
    })),
    // Constellation backlinks (direct post mentions without quote context)
    ...constellationBacklinks,
  ];

  return {
    ...document,
    quotesAndMentions,
  };
}

export type PostPageData = Awaited<ReturnType<typeof getPostPageData>>;
