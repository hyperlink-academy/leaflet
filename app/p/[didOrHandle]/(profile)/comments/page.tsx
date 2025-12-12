import { ReplyTiny } from "components/Icons/ReplyTiny";

export default function ProfileCommentsPage() {
  return <CommentsContent />;
}

const CommentsContent = () => {
  let isReply = true;
  return (
    <>
      <Comment
        displayName="celine"
        postTitle="Tagging and Flaggin Babyyyy make this super long so it doesn't wrap around please"
        comment="Here's my reply! I'm hoping i can makie ti long enought to space two lines. Do we want rich text here? Probably not since we dont support that anyway lol"
        isReply
      />
      <Comment
        displayName="celine"
        postTitle="Another day, another test post eh,"
        comment="Here's my reply! I'm hoping i can makie ti long enought to space two lines. Do we want rich text here? Probably not since we dont support that anyway lol"
      />
      <Comment
        displayName="celine"
        postTitle="Some other post title"
        comment="Here's my reply! I'm hoping i can makie ti long enought to space two lines. Do we want rich text here? Probably not since we dont support that anyway lol"
      />
      <Comment
        displayName="celine"
        postTitle="Leaflet Lab Notes"
        comment="Here's my reply! I'm hoping i can makie ti long enought to space two lines. Do we want rich text here? Probably not since we dont support that anyway lol"
        isReply
      />
    </>
  );
};

const Comment = (props: {
  displayName: React.ReactNode;
  postTitle: string;
  comment: string;
  isReply?: boolean;
}) => {
  return (
    <div className={`w-full flex flex-col text-left mb-8`}>
      <div className="flex gap-2 w-full">
        <div className={`rounded-full  bg-test shrink-0 w-5 h-5`} />
        <div className={`flex flex-col w-full min-w-0 grow`}>
          <div className="flex flex-row gap-2">
            <div className={`text-tertiary text-sm truncate`}>
              <span className="font-bold text-secondary">
                {props.displayName}
              </span>{" "}
              {props.isReply ? "replied" : "commented"} on{" "}
              <span className=" italic text-accent-contrast">
                {props.postTitle}
              </span>
            </div>
          </div>
          {props.isReply && (
            <div className="text-xs text-tertiary flex flex-row gap-2 w-full my-0.5 items-center">
              <ReplyTiny className="shrink-0" />
              <div className="font-bold shrink-0">jared</div>
              <div className="grow truncate">
                this is the content of what i was saying and its very long so i
                can get a good look at what's happening
              </div>
            </div>
          )}

          <div className={`w-full text-left text-secondary `}>
            {props.comment}
          </div>
        </div>
      </div>
    </div>
  );
};
