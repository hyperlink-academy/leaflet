import Link from "next/link";
import { Separator } from "components/Layout";
import { Json } from "supabase/database.types";
import { PubLeafletDocument } from "lexicons/src";
import { ButtonPrimary } from "components/Buttons";

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
        <div className="italic text-tertiary">
          Subscribe to publications to see posts in your feed
        </div>
      );
    }
    return (
      <div className="italic text-tertiary flex flex-col gap-2 justify-center place-items-center">
        <div>Welcome to your new Publication</div>
        <ButtonPrimary>Start Drafting!</ButtonPrimary>
      </div>
    );
  }
  return (
    <div className="pubPostList flex flex-col gap-3">
      {props.posts.map((post, index) => {
        let p = post.documents?.data as PubLeafletDocument.Record;
        return <PostListItem {...p} key={index} isFeed={props.isFeed} />;
      })}
    </div>
  );
};

const PostListItem = (
  props: {
    isFeed?: boolean;
  } & PubLeafletDocument.Record,
) => {
  return (
    <div className="pubPostListItem flex flex-col">
      {props.isFeed && (
        <Link
          href="./lish/publication"
          className="font-bold text-tertiary hover:no-underline text-sm "
        >
          {props.publication}
        </Link>
      )}
      <Link
        href="./lish/post"
        className="pubPostListContent flex flex-col hover:no-underline hover:text-accent-contrast"
      >
        <h4>{props.title}</h4>
        {/* <div className="text-secondary text-sm pt-1">placeholder description</div> */}
        <div className="flex gap-2 text-sm text-tertiary pt-4">
          <div className="">{props.publishedAt}</div>
          <Separator classname="h-4" />
          <div>{props.author}</div>
        </div>
        <hr className="border-border-light mt-3" />
      </Link>
    </div>
  );
};
