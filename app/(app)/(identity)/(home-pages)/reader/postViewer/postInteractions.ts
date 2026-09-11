import type { Post } from "actions/reader/getReaderFeed";
import { mergePreferences } from "src/utils/mergePreferences";

// Same availability logic as the feed card (PostListing).
export function getPostInteractions(post: Post) {
  let mergedPrefs = mergePreferences(
    post.documents.data?.preferences,
    post.publication?.pubRecord?.preferences,
  );
  let showComments = mergedPrefs.showComments !== false;
  return {
    showComments,
    showMentions: mergedPrefs.showMentions !== false,
    commentsCount: !showComments
      ? 0
      : post.documents.comments_on_documents?.[0]?.count || 0,
    quotesCount:
      post.documents.mentionsCount ??
      post.documents.document_mentions_in_bsky?.[0]?.count ??
      0,
    recommendsCount: post.documents.recommends_on_documents?.[0]?.count || 0,
  };
}
