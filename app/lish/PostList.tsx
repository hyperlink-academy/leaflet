"use client";
import Link from "next/link";
import { Json } from "supabase/database.types";
import { PubLeafletDocument } from "lexicons/api";
import { useIdentityData } from "components/IdentityProvider";
import { useParams } from "next/navigation";
import { AtUri } from "@atproto/syntax";
import { getPublicationURL } from "./createPub/getPublicationURL";

export const PostList = (props: {
  isFeed?: boolean;
  publication: { uri: string; record: Json; name: string };
  posts: {
    documents: {
      data: Json;
      indexed_at: string;
      uri: string;
    } | null;
  }[];
}) => {
  if (props.posts.length === 0) {
    if (props.isFeed) {
      return (
        <div className="italic text-tertiary w-full text-center pt-4">
          Subscribe to publications to see posts in your feed
        </div>
      );
    }
    return null;
  }

  return (
    <div className="pubPostList flex flex-col gap-3">
      {props.posts
        .sort((a, b) => {
          return a.documents?.indexed_at! > b.documents?.indexed_at! ? -1 : 1;
        })
        .map((post, index) => {
          let p = post.documents?.data as PubLeafletDocument.Record;
          let uri = new AtUri(post.documents?.uri!);

          return (
            <PostListItem
              {...p}
              publication_data={props.publication}
              key={index}
              isFeed={props.isFeed}
              uri={uri}
            />
          );
        })}
    </div>
  );
};

const PostListItem = (
  props: {
    publication_data: { uri: string; record: Json; name: string };
    isFeed?: boolean;
    uri: AtUri;
  } & PubLeafletDocument.Record,
) => {
  let { identity } = useIdentityData();
  let params = useParams();
  return (
    <div className="pubPostListItem flex flex-col">
      {props.isFeed && (
        <Link
          href={getPublicationURL(props.publication_data)}
          className="font-bold text-tertiary hover:no-underline text-sm "
        >
          {props.publication}
        </Link>
      )}

      <Link
        href={`${getPublicationURL(props.publication_data)}/${props.uri.rkey}/`}
        className="pubPostListContent flex flex-col hover:no-underline hover:text-accent-contrast"
      >
        <h4>{props.title}</h4>
        {/* <div className="text-secondary text-sm pt-1">placeholder description</div> */}
        <div className="flex gap-2 text-sm text-tertiary">
          {/* <div className="">{props.publishedAt}</div> */}
          {/* <Separator classname="h-4" /> */}
          <div>by {params.handle}</div>
        </div>
        <hr className="border-border-light mt-3" />
      </Link>
    </div>
  );
};
