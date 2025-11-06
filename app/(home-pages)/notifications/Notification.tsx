import { Avatar } from "components/Avatar";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import { CommentTiny } from "components/Icons/CommentTiny";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { MentionTiny } from "components/Icons/MentionTiny";
import { PubIcon } from "components/ActionBar/Publications";

export const Notification = (props: {
  identity: string;
  action:
    | { type: "comment" }
    | { type: "reply" }
    | { type: "follow"; avatar: string | undefined; pubName: string }
    | { type: "post-mention" }
    | { type: "user-mention" };

  content?: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col  w-full">
      <div className="flex flex-row gap-2 items-center">
        <div className="text-secondary shrink-0">
          {props.action.type === "comment" ? (
            <CommentTiny />
          ) : props.action.type === "reply" ? (
            <ReplyTiny />
          ) : props.action.type === "follow" ? (
            <Avatar
              src={props.action.avatar}
              displayName={props.identity}
              tiny
            />
          ) : props.action.type === "post-mention" ? (
            <MentionTiny />
          ) : props.action.type === "user-mention" ? (
            <MentionTiny />
          ) : (
            ""
          )}
        </div>
        <div className="text-secondary font-bold">
          {props.identity}{" "}
          {props.action.type === "comment"
            ? "commented on your post"
            : props.action.type === "reply"
              ? "replied to your comment"
              : props.action.type === "follow"
                ? `followed  ${props.action.pubName}!`
                : props.action.type === "post-mention"
                  ? `mentioned your post`
                  : props.action.type === "user-mention"
                    ? "mentioned you"
                    : "did something!"}
        </div>
      </div>
      {props.content && (
        <div className="flex flex-row gap-2 mt-1 w-full">
          <div className="w-4 shrink-0" />
          {props.content}
        </div>
      )}
    </div>
  );
};

export const ContentLayout = (props: {
  children: React.ReactNode;
  postTitle: string;
}) => {
  return (
    <div className="border border-border-light rounded-md px-2 py-[6px] w-full">
      <div className="text-tertiary text-sm italic font-bold pb-1">
        {props.postTitle}
      </div>
      {props.children}
      <hr className="mt-2 mb-1 border-border-light" />

      <div className="text-xs text-tertiary flex gap-[6px] items-center">
        <div className="bg-test rounded-full w-[12px] h-[12px] " />
        Pub Name Here
      </div>
    </div>
  );
};

type Facet = PubLeafletRichtextFacet.Main;
export const CommentInNotification = (props: {
  avatar: string | undefined;
  displayName: string;
  plaintext: string;
  facets?: Facet[];
  index: number[];
  className?: string;
}) => {
  return (
    <div className=" flex gap-2 text-sm w-full ">
      <Avatar src={props.avatar} displayName={props.displayName} />
      <pre
        style={{ wordBreak: "break-word" }}
        className={`whitespace-pre-wrap text-secondary line-clamp-6 ${props.className}`}
      >
        <BaseTextBlock
          preview
          index={props.index}
          plaintext={props.plaintext}
          facets={props.facets}
        />
      </pre>
    </div>
  );
};
