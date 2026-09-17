import { preload } from "swr";
import {
  getDocumentsByTag,
  getPublicationDocumentsByTag,
} from "app/(app)/(identity)/(home-pages)/tag/[tag]/getDocumentsByTag";

export type TagPostsSource = {
  tag: string;
  publicationUri?: string;
  showOtherPublications: boolean;
};

export const samePublicationKey = (tag: string, publicationUri: string) =>
  ["tag-publication-posts", tag, publicationUri] as const;
export const otherPublicationsKey = (tag: string) =>
  ["tag-posts", tag, "trending"] as const;

export const fetchSamePublication = (tag: string, publicationUri: string) =>
  getPublicationDocumentsByTag(tag, publicationUri);
export const fetchOtherPublications = (tag: string) =>
  getDocumentsByTag(tag, { orderBy: "trending" });

// Warms the same SWR entries TagPostsList reads, so the list is ready (or in
// flight) by the time a tag is clicked.
export function prefetchTagPosts(source: TagPostsSource) {
  let { tag, publicationUri } = source;
  if (publicationUri)
    preload(samePublicationKey(tag, publicationUri), () =>
      fetchSamePublication(tag, publicationUri),
    );
  if (source.showOtherPublications)
    preload(otherPublicationsKey(tag), () => fetchOtherPublications(tag));
}
