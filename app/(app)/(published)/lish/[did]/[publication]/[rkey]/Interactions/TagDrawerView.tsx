"use client";
import useSWR from "swr";
import { AtUri } from "@atproto/api";
import { DotLoader } from "components/utils/DotLoader";
import { PostListing } from "components/PostListing";
import { useDocument } from "contexts/DocumentContext";
import {
  getDocumentsByTag,
  getPublicationDocumentsByTag,
} from "app/(app)/(identity)/(home-pages)/tag/[tag]/getDocumentsByTag";
import { DrawerThreadContext } from "./drawerThreadContext";
import Link from "next/link";

// Fewer posts from other publications when this one already has plenty.
const SAME_PUBLICATION_THRESHOLD = 20;
const OTHER_PUBLICATIONS_LIMIT = 20;
const OTHER_PUBLICATIONS_LIMIT_WHEN_PLENTY = 5;

export function TagDrawerView(props: { tag: string }) {
  const { uri, publication, normalizedPublication } = useDocument();
  const showOtherPublications =
    normalizedPublication?.preferences?.showOtherPublicationsInTags !== false;

  const samePublicationQuery = useSWR(
    publication ? ["tag-publication-posts", props.tag, publication.uri] : null,
    () => getPublicationDocumentsByTag(props.tag, publication!.uri),
  );
  const samePublication = (samePublicationQuery.data?.posts ?? []).filter(
    (p) => p.documents.uri !== uri,
  );
  const otherPublicationsQuery = useSWR(
    showOtherPublications ? ["tag-posts", props.tag, "trending"] : null,
    () => getDocumentsByTag(props.tag, { orderBy: "trending" }),
  );

  if (samePublicationQuery.isLoading || otherPublicationsQuery.isLoading)
    return (
      <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
        <span>loading</span>
        <DotLoader />
      </div>
    );

  const currentPublicationKey = publicationKey(publication?.uri);
  const allOtherPublications = (otherPublicationsQuery.data?.posts ?? []).filter(
    (p) =>
      p.documents.uri !== uri &&
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
        No other posts tagged {props.tag}
      </div>
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

            {samePublication.map((post) => (
              <PostListing key={post.documents.uri} {...post} compact />
            ))}
          </>
        )}
        {inPubAndAtmo && <hr className="my-4" />}
        {otherPublications.length > 0 && (
          <>
            <h4>From across the Atmosphere</h4>
            {otherPublications.map((post) => (
              <PostListing key={post.documents.uri} {...post} compact />
            ))}
            {hasMore && (
              <Link
                href={`https://leaflet.pub/tag/${encodeURIComponent(props.tag)}`}
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
