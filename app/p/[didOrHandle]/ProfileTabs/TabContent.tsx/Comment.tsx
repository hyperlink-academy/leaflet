import Post from "app/lish/[did]/[publication]/[rkey]/l-quote/[quote]/page";
import { CommentTiny } from "components/Icons/CommentTiny";

export const CommentTabContent = () => {
  let isReply = true;
  return (
    <>
      <CommentWrapper2 isReply />
      <CommentWrapper2 />
      <CommentWrapper2 />
      <CommentWrapper2 isReply />
    </>
  );
};

const PostListingCompact = (props: { title: string; pubName: string }) => {
  return (
    <div className=" flex gap-2 justify-between border-b border-border-light   pt-2 pb-0.5 text-xs text-tertiary font-bold text-left">
      {props.title}
      <div className="flex gap-2 text-xs text-tertiary font-normal items-center">
        {props.pubName}
      </div>
    </div>
  );
};

const Comment = (props: {
  displayName: React.ReactNode;
  handle: string;
  comment: string;
  reply?: boolean;
}) => {
  return (
    <div className={`w-full flex flex-col ${props.reply ? "text-xs" : ""}`}>
      <div className="flex gap-2">
        <div className="flex flex-col  min-h-full shrink-0 ">
          <div className={`rounded-full  bg-test shrink-0 w-5 h-5`} />

          {props.reply && (
            <div className={`border-l border-border-light h-full mx-auto`} />
          )}
        </div>
        <div className={`flex flex-col`}>
          <div className="flex flex-row gap-2">
            <div
              className={` font-bold ${props.reply ? "text-tertiary" : "text-primary"}`}
            >
              {props.displayName}
            </div>
            {props.reply && <div>reply</div>}
          </div>
          <div
            className={`w-full text-left ${props.reply ? "truncate text-tertiary" : "text-secondary"} `}
          >
            {props.comment}
          </div>
        </div>
      </div>
    </div>
  );
};

const CommentWrapper1 = (props: { isReply?: boolean }) => {
  return (
    <div className="flex flex-col rounded-md  pb-8">
      <PostListingCompact title="Post Title Here" pubName="Pub Name" />
      {props.isReply && (
        <Comment
          displayName="jared"
          handle="awarm.space"
          comment="this is some content that i am would like a reply to. It's really really long"
          reply
        />
      )}
      <Comment
        displayName="celine"
        handle="cozylittle.house"
        comment="Here's my reply! I'm hoping i can makie ti long enought to space two lines. Do we want rich text here? Probably not since we dont support that anyway lol"
      />
    </div>
  );
};

const CommentWrapper2 = (props: { isReply?: boolean }) => {
  return (
    <div className="mb-8">
      <Comment
        displayName={
          <div className="font-normal text-tertiary text-sm">
            <span className="font-bold">celine </span>commented on{" "}
            <span className=" italic text-accent-contrast">
              Leaflet Lab Notes
            </span>
          </div>
        }
        handle="cozylittle.house"
        comment="Here's my reply! I'm hoping i can makie ti long enought to space two lines. Do we want rich text here? Probably not since we dont support that anyway lol"
      />
    </div>
  );
};
