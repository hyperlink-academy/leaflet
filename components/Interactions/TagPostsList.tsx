"use client";
import useSWR from "swr";
import { AtUri } from "@atproto/api";
import Link from "next/link";
import type { Post } from "actions/reader/getReaderFeed";
import { DotLoader } from "components/utils/DotLoader";
import { PostListing } from "components/PostListing";
import {
  type TagPostsSource,
  samePublicationKey,
  otherPublicationsKey,
  fetchSamePublication,
  fetchOtherPublications,
} from "./tagPosts";
import { DrawerThreadContext } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";

// Fewer posts from other publications when this one already has plenty.
const SAME_PUBLICATION_THRESHOLD = 20;
const OTHER_PUBLICATIONS_LIMIT = 20;
const OTHER_PUBLICATIONS_LIMIT_WHEN_PLENTY = 5;

export function TagPostsList(
  props: TagPostsSource & {
    // The post the list was opened from, left out of its own results.
    documentUri: string;
    onOpenPost?: (posts: Post[], uri: string) => void;
  },
) {
  const { tag, publicationUri, documentUri } = props;
  const samePublicationQuery = useSWR(
    publicationUri ? samePublicationKey(tag, publicationUri) : null,
    () => fetchSamePublication(tag, publicationUri!),
  );
  const samePublication = (samePublicationQuery.data?.posts ?? []).filter(
    (p) => p.documents.uri !== documentUri,
  );
  const otherPublicationsQuery = useSWR(
    props.showOtherPublications ? otherPublicationsKey(tag) : null,
    () => fetchOtherPublications(tag),
  );

  if (samePublicationQuery.isLoading || otherPublicationsQuery.isLoading)
    return (
      <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
        <span>loading</span>
        <DotLoader />
      </div>
    );

  const currentPublicationKey = publicationKey(publicationUri);
  const allOtherPublications = (
    otherPublicationsQuery.data?.posts ?? []
  ).filter(
    (p) =>
      p.documents.uri !== documentUri &&
      (!currentPublicationKey ||
        publicationKey(p.publication?.uri) !== currentPublicationKey),
  );
  const otherPublications = allOtherPublications.slice(
    0,
    samePublication.length >= SAME_PUBLICATION_THRESHOLD
      ? OTHER_PUBLICATIONS_LIMIT_WHEN_PLENTY
      : OTHER_PUBLICATIONS_LIMIT,
  );
  const hasMore = allOtherPublications.length > otherPublications.length;

  let inPubAndAtmo = samePublication.length > 0 && otherPublications.length > 0;

  if (samePublication.length + otherPublications.length === 0)
    return (
      <div className="text-tertiary italic text-sm py-8 text-center">
        No other posts tagged {tag}
      </div>
    );

  const allPosts = [...samePublication, ...otherPublications];
  const renderPost = (post: Post) => (
    <PostListing
      key={post.documents.uri}
      {...post}
      compact
      onOpenInViewer={
        props.onOpenPost
          ? () => props.onOpenPost!(allPosts, post.documents.uri)
          : undefined
      }
    />
  );

  return (
    // Null out the drawer's navigation so the listings' discussion and
    // recommend buttons open their modals: pushing another post's discussion
    // onto the drawer would strand the reader with no way back to this list.
    <DrawerThreadContext.Provider value={null}>
      <div className="tagDrawerView flex flex-col gap-4">
        {samePublication.length > 0 && (
          <>
            {inPubAndAtmo && <h4>From this Publication</h4>}
            {samePublication.map(renderPost)}
          </>
        )}
        {inPubAndAtmo && <hr className="my-4" />}
        {otherPublications.length > 0 && (
          <>
            <h4>From across the Atmosphere</h4>
            {otherPublications.map(renderPost)}
            {hasMore && (
              <Link
                href={`https://leaflet.pub/tag/${encodeURIComponent(tag)}`}
                className="text-sm text-tertiary hover:text-accent-contrast text-center pt-1"
              >
                See more
              </Link>
            )}
          </>
        )}
      </div>
    </DrawerThreadContext.Provider>
  );
}

// A publication's pub.leaflet and site.standard records share a did and rkey.
function publicationKey(uri: string | undefined) {
  if (!uri) return null;
  try {
    const { host, rkey } = new AtUri(uri);
    return `${host}/${rkey}`;
  } catch {
    return null;
  }
}
