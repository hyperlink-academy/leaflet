"use client";
import useSWR from "swr";
import { DotLoader } from "components/utils/DotLoader";
import { PostListing } from "components/PostListing";
import { useDocument } from "contexts/DocumentContext";
import { getDocumentsByTag } from "app/(app)/(identity)/(home-pages)/tag/[tag]/getDocumentsByTag";
import Link from "next/link";

const OTHER_PUBLICATIONS_LIMIT = 20;

export function TagDrawerView(props: { tag: string }) {
  const { uri, publication, normalizedPublication } = useDocument();
  // Publication-level only — a post can't opt its own tag window in or out.
  const showOtherPublications =
    normalizedPublication?.preferences?.showOtherPublicationsInTags !== false;
  const { data, isLoading } = useSWR(["tag-posts", props.tag, "trending"], () =>
    getDocumentsByTag(props.tag, { orderBy: "trending" }),
  );

  if (!data && isLoading)
    return (
      <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
        <span>loading</span>
        <DotLoader />
      </div>
    );

  const posts = (data?.posts ?? []).filter((p) => p.documents.uri !== uri);
  const samePublication = publication
    ? posts.filter((p) => p.publication?.uri === publication.uri)
    : [];
  const allOtherPublications = !showOtherPublications
    ? []
    : publication
      ? posts.filter((p) => p.publication?.uri !== publication.uri)
      : posts;
  const otherPublications = allOtherPublications.slice(
    0,
    OTHER_PUBLICATIONS_LIMIT,
  );
  const hasMore = allOtherPublications.length > otherPublications.length;

  let inPubAndAtmo = samePublication.length > 0 && otherPublications.length > 0;

  // Counts what's actually rendered, not what was fetched — with other
  // publications turned off the tag can have posts and still show nothing.
  if (samePublication.length + otherPublications.length === 0)
    return (
      <div className="text-tertiary italic text-sm py-8 text-center">
        No other posts tagged {props.tag}
      </div>
    );

  return (
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
            // The drawer renders on custom domains too, where /tag would 404,
            // so link out the way tag chips do.
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
  );
}
