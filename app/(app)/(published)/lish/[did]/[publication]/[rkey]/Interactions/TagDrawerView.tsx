"use client";
import useSWR from "swr";
import { DotLoader } from "components/utils/DotLoader";
import { PostListing } from "components/PostListing";
import { useDocument } from "contexts/DocumentContext";
import { getDocumentsByTag } from "app/(app)/(identity)/(home-pages)/tag/[tag]/getDocumentsByTag";

export function TagDrawerView(props: { tag: string }) {
  const { uri, publication } = useDocument();
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
  const otherPublications = publication
    ? posts.filter((p) => p.publication?.uri !== publication.uri)
    : posts;

  let inPubAndAtmo = samePublication.length > 0 && otherPublications.length > 0;

  if (posts.length === 0)
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
        </>
      )}
    </div>
  );
}
