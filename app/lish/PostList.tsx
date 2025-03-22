"use client";
import Link from "next/link";
import { Separator } from "components/Layout";
import { Json } from "supabase/database.types";
import { PubLeafletDocument } from "lexicons/src";
import { ButtonPrimary } from "components/Buttons";
import { useIdentityData } from "components/IdentityProvider";
import { usePublicationRelationship } from "./[handle]/[publication]/usePublicationRelationship";
import { useParams } from "next/navigation";
import { AtUri } from "@atproto/syntax";

export const PostList = (props: {
  isFeed?: boolean;
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
            <PostListItem {...p} key={index} isFeed={props.isFeed} uri={uri} />
          );
        })}
    </div>
  );
};

const PostListItem = (
  props: {
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
          href={`/lish/${identity?.resolved_did?.alsoKnownAs?.[0].slice(5)}/${props.publication}/`}
          className="font-bold text-tertiary hover:no-underline text-sm "
        >
          {props.publication}
        </Link>
      )}

      <Link
        href={`/lish/${params.handle}/${params.publication}/${props.uri.rkey}/`}
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
