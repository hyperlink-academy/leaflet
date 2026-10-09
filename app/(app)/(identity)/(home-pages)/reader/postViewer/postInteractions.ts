import type { Post } from "actions/reader/getReaderFeed";
import { mergePreferences } from "src/utils/mergePreferences";
import { hasLeafletContent } from "lexicons/src/normalize";

// Shared by the feed card (PostListing) and the reader's post viewer.
export function getPostInteractions(post: Post) {
  let mergedPrefs = mergePreferences(
    post.documents.data?.preferences,
    post.publication?.pubRecord?.preferences,
  );
  // Third-party posts render in an iframe of their own site, which has no way
  // to show or moderate Leaflet comments, so they take none.
  let showComments =
    mergedPrefs.showComments !== false &&
    !!post.documents.data &&
    hasLeafletContent(post.documents.data);
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
