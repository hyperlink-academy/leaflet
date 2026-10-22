"use server";

import { getPublicationPrevNextCandidates } from "src/utils/publicationPrevNextPosts";
import { sortPostsForPrevNext } from "src/utils/prevNextPosts";
import { postMatchesTags } from "src/utils/postsListPagination";

export async function getFilteredPrevNextPosts(
  publicationUri: string,
  tags: string[],
): Promise<{ uri: string; title: string }[]> {
  if (
    typeof publicationUri !== "string" ||
    !Array.isArray(tags) ||
    tags.length === 0 ||
    !tags.every((t) => typeof t === "string")
  )
    return [];
  const candidates = await getPublicationPrevNextCandidates(publicationUri);
  return sortPostsForPrevNext(
    candidates.filter((doc) => postMatchesTags(doc.tags, tags)),
  ).map((doc) => ({ uri: doc.uri, title: doc.title || "" }));
}
