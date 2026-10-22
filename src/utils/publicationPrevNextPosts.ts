import { unstable_cache } from "next/cache";
import { supabaseServerClient } from "supabase/serverClient";
import type { PrevNextCandidate } from "src/utils/prevNextPosts";

export function publicationPostsCacheTag(publicationUri: string) {
  return `publication-posts:${publicationUri}`;
}

export type TaggedPrevNextCandidate = PrevNextCandidate & {
  uri: string;
  tags: string[];
};

export function getPublicationPrevNextCandidates(
  publicationUri: string,
): Promise<TaggedPrevNextCandidate[]> {
  return unstable_cache(
    async () => {
      const { data } = await supabaseServerClient
        .from("documents_in_publications")
        .select(
          "documents(uri, sort_date, title:data->>title, publishedAt:data->>publishedAt, tags:data->tags)",
        )
        .eq("publication", publicationUri);
      return (data ?? []).flatMap(({ documents: doc }) =>
        doc
          ? [
              {
                uri: doc.uri,
                sort_date: doc.sort_date,
                title: doc.title,
                publishedAt: doc.publishedAt,
                tags: Array.isArray(doc.tags)
                  ? doc.tags.filter((t): t is string => typeof t === "string")
                  : [],
              },
            ]
          : [],
      );
    },
    ["publication-prev-next-candidates", publicationUri],
    { tags: [publicationPostsCacheTag(publicationUri)], revalidate: 3600 },
  )();
}
